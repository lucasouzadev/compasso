import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { useReducedMotion } from "react-native-reanimated";
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
  matchesDiaryTag,
  normalizeDiarySearch,
  type Entry,
} from "./entries";
import { DiaryTagFilter } from "./DiaryTagFilter";
import { entryPhotoUri, readSearchEntries } from "./storage";

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
  const [tag, setTag] = useState<string>();
  const [selected, setSelected] = useState<Entry>();
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
    if (selected) setSelected(undefined);
    else {
      Keyboard.dismiss();
      onClose();
    }
  }

  const photo = selected && entryPhotoUri(selected);
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
                  label={selected ? "Voltar aos resultados" : "Fechar busca"}
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
                <View style={styles.headerSpacer} />
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
                    {[false, true].map((value) => (
                      <Pressable
                        key={String(value)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: favorites === value }}
                        onPress={() => setFavorites(value)}
                        style={[
                          styles.tab,
                          favorites === value && {
                            backgroundColor: theme.line,
                          },
                        ]}
                      >
                        <Text style={{ color: theme.ink }}>
                          {value ? "Favoritos" : "Buscar"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {tags.length > 0 && (
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
                      contentContainerStyle={styles.results}
                      ListEmptyComponent={
                        (hasQuery || favorites || !!tag) && !ready ? (
                          <ActivityIndicator
                            accessibilityLabel="Buscando entradas"
                            color={theme.accent}
                          />
                        ) : (
                          <Text style={[styles.empty, { color: theme.muted }]}>
                            {emptyText}
                          </Text>
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
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            Keyboard.dismiss();
                            setSelected(item);
                          }}
                          style={({ pressed }) => [
                            styles.result,
                            {
                              borderBottomColor: theme.line,
                              opacity: pressed ? 0.65 : 1,
                            },
                          ]}
                        >
                          <View style={styles.fill}>
                            <Text style={[styles.time, { color: theme.muted }]}>
                              {entryTime(item)}
                            </Text>
                            <Text
                              numberOfLines={3}
                              style={[styles.excerpt, { color: theme.ink }]}
                            >
                              {item.text || "Foto"}
                            </Text>
                          </View>
                          <Symbol
                            name="chevron.right"
                            size={13}
                            color={theme.muted}
                          />
                        </Pressable>
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
                      <Text
                        selectable
                        style={[styles.excerpt, { color: theme.ink }]}
                      >
                        {selected.text}
                      </Text>
                      {photo && (
                        <Image
                          source={{ uri: photo }}
                          accessibilityLabel="Foto da entrada"
                          resizeMode="contain"
                          style={styles.photo}
                        />
                      )}
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
  tabs: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
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
  results: { paddingTop: 18, paddingBottom: 60 },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  day: { fontSize: 13, fontWeight: "600", paddingTop: 16, paddingBottom: 5 },
  result: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
