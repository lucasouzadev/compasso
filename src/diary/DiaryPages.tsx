import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassButton } from "../cookbooks/zest/components/ui/GlassButton";
import { parseDay } from "../cookbooks/zest/data/diary";
import { theme } from "./diaryStyles";
import type { Entry } from "./entries";
import { entryPhotoUri, readSearchEntries } from "./storage";

const gap = 14;
const emptyIds: string[] = [];

export function DiaryPages({
  days,
  index,
  activeDay,
  today,
  reducedMotion,
  onOpenDay,
  onClose,
}: {
  days: string[];
  index: Map<string, string[]>;
  activeDay: string;
  today: string;
  reducedMotion: boolean;
  onOpenDay: (day: string) => void;
  onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardWidth = Math.min(width - 76, 520);
  const stride = cardWidth + gap;
  const activeIndex = Math.max(0, days.indexOf(activeDay));
  return (
    <Modal
      animationType={reducedMotion ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 12 },
        ]}
        onAccessibilityEscape={onClose}
      >
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text accessibilityRole="header" style={styles.title}>
            Páginas
          </Text>
          <GlassButton
            name="xmark"
            label="Fechar páginas"
            prominent
            onPress={onClose}
          />
        </View>
        <FlatList
          key={stride}
          horizontal
          accessibilityLabel="Páginas do diário"
          data={days}
          keyExtractor={(day) => day}
          initialScrollIndex={activeIndex}
          getItemLayout={(_, itemIndex) => ({
            length: stride,
            offset: stride * itemIndex,
            index: itemIndex,
          })}
          snapToInterval={stride}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: (width - cardWidth) / 2 }}
          ItemSeparatorComponent={PageGap}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={5}
          renderItem={({ item: day }) => (
            <DayPage
              width={cardWidth}
              day={day}
              current={day === activeDay}
              today={day === today}
              ids={index.get(day) ?? emptyIds}
              onPress={() => onOpenDay(day)}
            />
          )}
        />
      </View>
    </Modal>
  );
}

function PageGap() {
  return <View style={{ width: gap }} />;
}

function DayPage({
  width,
  day,
  current,
  today,
  ids,
  onPress,
}: {
  width: number;
  day: string;
  current: boolean;
  today: boolean;
  ids: string[];
  onPress: () => void;
}) {
  const [preview, setPreview] = useState<Entry[]>([]);
  useEffect(() => {
    const abort = new AbortController();
    void readSearchEntries(new Map([[day, ids]]), abort.signal).then(
      ({ entries }) => {
        if (!abort.signal.aborted) setPreview(entries.reverse());
      },
    );
    return () => abort.abort();
  }, [day, ids]);
  const date = parseDay(day);
  const title = today
    ? "Hoje"
    : date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  const count = ids.length === 1 ? "1 registro" : `${ids.length} registros`;
  return (
    <View style={[styles.card, { width }, current && styles.current]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir ${title}, ${date.getFullYear()}, ${count}`}
        accessibilityState={{ selected: current }}
        onPress={onPress}
        style={({ pressed }) => [styles.pageHeading, pressed && styles.pressed]}
      >
        <Text style={styles.date}>{title}</Text>
        <Text style={styles.count}>
          {date.getFullYear()} · {count}
        </Text>
      </Pressable>
      <FlatList
        nestedScrollEnabled
        bounces={false}
        style={styles.messages}
        contentContainerStyle={styles.messageList}
        data={preview}
        keyExtractor={(entry) => entry.id}
        ListEmptyComponent={
          !ids.length ? (
            <Text style={styles.count}>Nenhuma entrada neste dia.</Text>
          ) : undefined
        }
        renderItem={({ item: entry }) => {
          const photo = entryPhotoUri(entry);
          return (
            <Pressable
              onPress={onPress}
              accessibilityRole="button"
              accessibilityHint="Abre a página do dia"
              style={styles.bubble}
            >
              {!!entry.text && (
                <Text numberOfLines={3} style={styles.message}>
                  {entry.text}
                </Text>
              )}
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                !entry.text && <Text style={styles.message}>Foto</Text>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#DCD4C8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingTop: 8,
  },
  headerSpacer: { width: 44 },
  title: {
    flex: 1,
    textAlign: "center",
    color: theme.ink,
    fontSize: 20,
    fontWeight: "600",
  },
  card: {
    alignSelf: "stretch",
    borderRadius: 30,
    borderCurve: "continuous",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: theme.paper,
    overflow: "hidden",
    padding: 18,
  },
  current: { borderColor: theme.accent },
  pressed: { opacity: 0.8 },
  date: { color: theme.ink, fontSize: 22, fontWeight: "600" },
  count: { color: theme.muted, fontSize: 13 },
  pageHeading: { minHeight: 44 },
  messages: { flex: 1, marginTop: 12 },
  messageList: { gap: 8 },
  bubble: {
    alignSelf: "flex-end",
    maxWidth: "90%",
    borderRadius: 14,
    padding: 9,
    gap: 6,
    backgroundColor: "#F8DFDB",
  },
  message: { color: theme.ink, fontSize: 14 },
  photo: { width: 130, maxWidth: "100%", height: 92, borderRadius: 8 },
});
