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
    const newest = [...ids].sort((a, b) => b.localeCompare(a)).slice(0, 4);
    void readSearchEntries(new Map([[day, newest]]), abort.signal).then(
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
  const photoEntry = preview.findLast((entry) => entry.photo);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${date.getFullYear()}, ${count}`}
      accessibilityState={{ selected: current }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width },
        current && styles.current,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.date}>{title}</Text>
      <Text style={styles.count}>
        {date.getFullYear()} · {count}
      </Text>
      <View style={styles.messages}>
        {preview.map((entry) => {
          const photo = entry === photoEntry ? entryPhotoUri(entry) : undefined;
          return (
            <View key={entry.id} style={styles.bubble}>
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
            </View>
          );
        })}
        {!ids.length && (
          <Text style={styles.count}>Nenhuma entrada neste dia.</Text>
        )}
      </View>
    </Pressable>
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
  messages: { marginTop: 18, gap: 8 },
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
