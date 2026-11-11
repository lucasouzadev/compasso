import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";
import { dayKey, parseDay } from "../cookbooks/zest/data/diary";
import { GlassButton } from "../cookbooks/zest/components/ui/GlassButton";
import { ProgressiveBlur } from "../cookbooks/zest/components/ui/ProgressiveBlur";
import {
  GlassSurface,
  useGlassTheme,
} from "../cookbooks/zest/components/ui/GlassSurface";
import { Symbol } from "../cookbooks/zest/components/ui/Touch";
import {
  collectDiaryTags,
  diarySearchExcerpt,
  matchesDiaryTag,
  normalizeDiarySearch,
  type Entry,
} from "./entries";
import { DiaryTagFilter, DiaryTagMenu } from "./DiaryTagFilter";
import { DiaryEntryBody } from "./DiaryEntryBody";
import { readEntry, readSearchEntries } from "./storage";

const appear = FadeInDown.duration(180).reduceMotion(ReduceMotion.System);
const fade = FadeIn.duration(160).reduceMotion(ReduceMotion.System);

const dateLabel = (day: string) =>
  parseDay(day).toLocaleDateString("pt-BR", { dateStyle: "long" });
const entryDay = (entry: Entry) => dayKey(new Date(entry.createdAt));
const entryTime = (entry: Entry) =>
  new Date(entry.createdAt).toLocaleTimeString("pt-BR", { timeStyle: "short" });

export function DiarySearch({
  index,
  onClose,
}: {
  index: ReadonlyMap<string, readonly string[]>;
  onClose: () => void;
}) {
  const theme = useGlassTheme();
  const reducedMotion = useReducedMotion();
  const input = useRef<TextInputInstance>(null);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(false);
  const indicator = useAnimatedStyle(() => ({
    left: withTiming(favorites ? "50%" : "0%", {
      duration: 180,
      reduceMotion: ReduceMotion.System,
    }),
  }));
  const [tag, setTag] = useState<string>();
  const [selected, setSelected] = useState<Entry>();
  const [history, setHistory] = useState<Entry[]>([]);
  const [readingOffset, setReadingOffset] = useState(0);
  const readingOffsets = useRef(new Map<string, number>());
  const [loaded, setLoaded] = useState<{
    source: typeof index;
    rows: { entry: Entry; searchable: string }[];
    skipped: number;
  }>();
  const normalized = normalizeDiarySearch(query);
  const hasQuery = normalized.length > 0;
  const deferredQuery = useDeferredValue(normalized);
  const ready = loaded?.source === index;
  const tags = useMemo(
    () =>
      loaded ? collectDiaryTags(loaded.rows.map(({ entry }) => entry)) : [],
    [loaded],
  );

  useEffect(() => {
    if (ready) return;
    const abort = new AbortController();
    void readSearchEntries(index, abort.signal).then(({ entries, skipped }) => {
      if (abort.signal.aborted) return;
      setLoaded({
        source: index,
        rows: entries.map((entry) => ({
          entry,
          searchable: normalizeDiarySearch(entry.text),
        })),
        skipped,
      });
    });
    return () => abort.abort();
  }, [index, ready]);

  const sections = useMemo(() => {
    if ((!hasQuery && !favorites && !tag) || loaded?.source !== index)
      return [];
    const terms = hasQuery && deferredQuery ? deferredQuery.split(" ") : [];
    const byDay = new Map<string, Entry[]>();
    for (const { entry, searchable } of loaded.rows) {
      if (
        (favorites && !entry.favorite) ||
        (tag && !matchesDiaryTag(entry, tag)) ||
        !terms.every((term) => searchable.includes(term))
      )
        continue;
      const day = entryDay(entry);
      const entries = byDay.get(day);
      if (entries) entries.push(entry);
      else byDay.set(day, [entry]);
    }
    return Array.from(byDay, ([day, data]) => ({ day, data }));
  }, [deferredQuery, favorites, hasQuery, index, loaded, tag]);

  function goBack() {
    if (history.length) {
      const target = history[history.length - 1];
      setReadingOffset(readingOffsets.current.get(target.id) ?? 0);
      setSelected(target);
      setHistory((current) => current.slice(0, -1));
    } else if (selected) setSelected(undefined);
    else {
      Keyboard.dismiss();
      onClose();
    }
  }

  let previous: Entry | undefined;
  if (selected?.continuationOf) {
    try {
      previous = readEntry(selected.continuationOf);
    } catch {
      // The citation snapshot remains readable when the source is unavailable.
    }
  }
  const emptyText =
    favorites && !hasQuery && !tag
      ? "Favorite entradas pelo menu para encontrá-las aqui."
      : hasQuery || tag
        ? "Nenhuma entrada corresponde à busca."
        : "Digite uma palavra ou trecho para encontrar o que escreveu.";

  return (
    <Modal
      presentationStyle="pageSheet"
      animationType={reducedMotion ? "none" : "slide"}
      onShow={() => input.current?.focus()}
      onRequestClose={goBack}
    >
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaProvider
          style={[styles.fill, { backgroundColor: theme.paper }]}
        >
          <KeyboardAvoidingView
            automaticOffset
            behavior="padding"
            enabled={Platform.OS === "ios"}
            style={styles.fill}
            onAccessibilityEscape={goBack}
          >
            <SafeAreaView
              edges={{
                top: "maximum",
                bottom: "maximum",
                left: "maximum",
                right: "maximum",
              }}
              style={styles.sheet}
            >
              <View style={styles.header}>
                <GlassButton
                  name={selected ? "chevron.left" : "xmark"}
                  label={
                    history.length
                      ? "Voltar à entrada"
                      : selected
                        ? "Voltar aos resultados"
                        : "Fechar busca"
                  }
                  onPress={goBack}
                />
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: theme.ink }]}
                >
                  {selected
                    ? "Entrada"
                    : favorites
                      ? "Favoritos"
                      : "Buscar no diário"}
                </Text>
                {!selected && Platform.OS !== "web" ? (
                  <DiaryTagMenu
                    tags={tags}
                    selected={tag}
                    ready={ready}
                    onSelect={setTag}
                    iconOnly
                  />
                ) : (
                  <View style={styles.headerSpacer} />
                )}
              </View>
              <View style={styles.fill}>
                <View
                  style={styles.fill}
                  pointerEvents={selected ? "none" : "auto"}
                  accessibilityElementsHidden={!!selected}
                  importantForAccessibility={
                    selected ? "no-hide-descendants" : "auto"
                  }
                >
                  <View style={styles.tabs}>
                    <View pointerEvents="none" style={styles.tabGlassBacking}>
                      <GlassSurface style={styles.tabGlass} materialize={0} />
                    </View>
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.tabIndicator, indicator]}
                    />
                    {[false, true].map((value) => (
                      <Pressable
                        key={String(value)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: favorites === value }}
                        onPress={() => setFavorites(value)}
                        style={styles.tab}
                      >
                        <Symbol
                          name={value ? "bookmark" : "magnifyingglass"}
                          size={14}
                          color={
                            favorites === value ? theme.accent : theme.muted
                          }
                        />
                        <Text
                          style={[
                            styles.tabLabel,
                            {
                              color:
                                favorites === value
                                  ? theme.accent
                                  : theme.muted,
                            },
                          ]}
                        >
                          {value ? "Favoritos" : "Buscar"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {Platform.OS === "web" && tags.length > 0 && (
                    <DiaryTagFilter
                      tags={tags}
                      selected={tag}
                      onSelect={setTag}
                    />
                  )}
                  <View pointerEvents="box-none" style={styles.searchDock}>
                    <GlassSurface materialize={0} style={styles.searchField}>
                      <Symbol
                        name="magnifyingglass"
                        size={17}
                        color={theme.muted}
                      />
                      <TextInput
                        ref={input}
                        accessibilityLabel="Texto para buscar"
                        placeholder="Busque pelo que escreveu"
                        placeholderTextColor={theme.muted}
                        selectionColor={theme.accent}
                        value={query}
                        onChangeText={setQuery}
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: theme.ink }]}
                      />
                      {query.length > 0 && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Limpar busca"
                          onPress={() => {
                            setQuery("");
                            input.current?.focus();
                          }}
                          style={styles.clear}
                        >
                          <Symbol
                            name="xmark.circle.fill"
                            size={18}
                            color={theme.muted}
                          />
                        </Pressable>
                      )}
                    </GlassSurface>
                  </View>
                  <View style={styles.fill}>
                    <SectionList
                      sections={sections}
                      keyExtractor={(entry) => entry.id}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="interactive"
                      stickySectionHeadersEnabled={false}
                      contentContainerStyle={[
                        styles.results,
                        !sections.length && styles.emptyResults,
                      ]}
                      ListEmptyComponent={
                        (hasQuery || favorites || !!tag) && !ready ? (
                          <ActivityIndicator
                            accessibilityLabel="Buscando entradas"
                            color={theme.accent}
                          />
                        ) : (
                          <Animated.View
                            entering={appear}
                            key={emptyText}
                            style={styles.emptyState}
                          >
                            <View
                              accessible={false}
                              style={styles.illustration}
                            >
                              <View style={styles.illustrationPage} />
                              <Symbol
                                name={
                                  favorites ? "bookmark" : "magnifyingglass"
                                }
                                size={30}
                                color={theme.accent}
                              />
                            </View>
                            <Text
                              style={[styles.emptyTitle, { color: theme.ink }]}
                            >
                              {favorites && !hasQuery && !tag
                                ? "Seus favoritos"
                                : hasQuery || tag
                                  ? "Sem resultados"
                                  : "Reencontre um pensamento"}
                            </Text>
                            <Text
                              style={[styles.empty, { color: theme.muted }]}
                            >
                              {emptyText}
                            </Text>
                          </Animated.View>
                        )
                      }
                      ListFooterComponent={
                        (hasQuery || favorites || !!tag) &&
                        ready &&
                        !!loaded.skipped ? (
                          <Text style={[styles.empty, { color: theme.muted }]}>
                            Algumas entradas não puderam ser lidas.
                          </Text>
                        ) : undefined
                      }
                      renderSectionHeader={({ section }) => (
                        <Text
                          accessibilityRole="header"
                          style={[styles.day, { color: theme.muted }]}
                        >
                          {dateLabel(section.day)}
                        </Text>
                      )}
                      renderItem={({ item }) => (
                        <Animated.View entering={fade}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              Keyboard.dismiss();
                              setReadingOffset(0);
                              setHistory([]);
                              setSelected(item);
                            }}
                            style={({ pressed }) => [
                              styles.result,
                              {
                                borderColor: theme.line,
                                opacity: pressed ? 0.65 : 1,
                              },
                            ]}
                          >
                            <View style={styles.resultIcon}>
                              <Symbol
                                name={
                                  item.favorite
                                    ? "bookmark.fill"
                                    : item.photo
                                      ? "photo"
                                      : "text.alignleft"
                                }
                                size={17}
                                color={theme.accent}
                              />
                            </View>
                            <View style={styles.fill}>
                              <Text
                                style={[styles.time, { color: theme.muted }]}
                              >
                                {entryTime(item)}
                              </Text>
                              <Text
                                numberOfLines={2}
                                style={[styles.excerpt, { color: theme.ink }]}
                              >
                                {diarySearchExcerpt(item.text, deferredQuery) ||
                                  "Foto"}
                              </Text>
                            </View>
                            <Symbol
                              name="chevron.right"
                              size={13}
                              color={theme.muted}
                            />
                          </Pressable>
                        </Animated.View>
                      )}
                    />
                    <ProgressiveBlur
                      singlePass
                      edge="top"
                      height={18}
                      color={theme.paper}
                    />
                  </View>
                </View>
                {selected && (
                  <ScrollView
                    key={selected.id}
                    contentOffset={{
                      x: 0,
                      y: readingOffset,
                    }}
                    scrollEventThrottle={16}
                    onScroll={({ nativeEvent }) =>
                      readingOffsets.current.set(
                        selected.id,
                        nativeEvent.contentOffset.y,
                      )
                    }
                    contentContainerStyle={{ paddingBottom: 24 }}
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: theme.paper },
                    ]}
                  >
                    <Text style={[styles.day, { color: theme.muted }]}>
                      {dateLabel(entryDay(selected))} · {entryTime(selected)}
                    </Text>
                    <View
                      style={[styles.entry, { backgroundColor: "#F8DFDB" }]}
                    >
                      <DiaryEntryBody
                        entry={selected}
                        previous={previous}
                        selectable
                        showFavorite
                        onOpenOriginal={(source) => {
                          setReadingOffset(0);
                          setHistory((current) => [...current, selected]);
                          setSelected(source);
                        }}
                      />
                    </View>
                  </ScrollView>
                )}
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerSpacer: { width: 44 },
  title: { flex: 1, fontSize: 19, fontWeight: "600", textAlign: "center" },
  tabs: {
    flexDirection: "row",
    alignSelf: "center",
    width: "100%",
    maxWidth: 330,
  },
  tabGlassBacking: {
    position: "absolute",
    top: 5,
    bottom: 5,
    left: 0,
    right: 0,
  },
  tabGlass: { flex: 1, borderRadius: 17 },
  tabIndicator: {
    position: "absolute",
    width: "50%",
    top: 8,
    bottom: 8,
    borderRadius: 18,
    backgroundColor: "#F2DAD3A6",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: { fontSize: 14, fontWeight: "600" },
  searchDock: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1 },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 4,
    gap: 10,
    borderRadius: 24,
  },
  input: { flex: 1, minHeight: 44, fontSize: 16 },
  clear: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyResults: { flexGrow: 1, justifyContent: "center" },
  emptyState: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  illustration: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationPage: {
    position: "absolute",
    width: 45,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#F3DDD5",
    transform: [{ rotate: "-12deg" }],
  },
  results: { paddingTop: 18, paddingBottom: 60 },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 260,
  },
  day: { fontSize: 13, fontWeight: "600", paddingTop: 16, paddingBottom: 5 },
  result: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 17,
    backgroundColor: "#FFFCF8",
    borderWidth: StyleSheet.hairlineWidth,
  },
  resultIcon: {
    width: 33,
    height: 33,
    borderRadius: 11,
    backgroundColor: "#F7E5DF",
    alignItems: "center",
    justifyContent: "center",
  },
  time: { fontSize: 12, marginBottom: 4 },
  excerpt: { fontSize: 16, lineHeight: 22 },
  entry: {
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 18,
    gap: 12,
  },
  photo: { width: "100%", aspectRatio: 1.5, borderRadius: 12 },
});
