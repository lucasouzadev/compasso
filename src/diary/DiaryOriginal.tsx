import { BottomSheet, Group, Host } from "@expo/ui/swift-ui";
import {
  presentationDetents,
  presentationDragIndicator,
} from "@expo/ui/swift-ui/modifiers";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { GlassButton } from "../cookbooks/zest/components/ui/GlassButton";
import { DiaryEntryBody } from "./DiaryEntryBody";
import { DiaryReadingScroll, hasNativeDiaryReading } from "./DiaryScrollEdge";
import type { Entry } from "./entries";
import { styles, theme } from "./diaryStyles";
import { useState } from "react";

export function DiaryOriginal({
  entry,
  previous,
  date,
  onClose,
}: {
  entry: Entry;
  previous?: Entry;
  date: string;
  onClose: () => void;
}) {
  const { height } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const maxHeight = Math.round(height * 0.72);
  const content = (
    <View
      style={local.content}
      onLayout={(event) =>
        setContentHeight(Math.ceil(event.nativeEvent.layout.height))
      }
    >
      <Text style={styles.muted}>{date}</Text>
      <DiaryEntryBody
        entry={entry}
        previous={previous}
        selectable
        showFavorite
      />
    </View>
  );

  if (hasNativeDiaryReading) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Host style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BottomSheet
            isPresented
            onIsPresentedChange={(open) => {
              if (!open) onClose();
            }}
          >
            <Group
              modifiers={[
                presentationDetents([
                  {
                    height: contentHeight
                      ? Math.max(130, Math.min(maxHeight, contentHeight + 54))
                      : maxHeight,
                  },
                ]),
                presentationDragIndicator("visible"),
              ]}
            >
              <DiaryReadingScroll title="Entrada original" onClose={onClose}>
                {content}
              </DiaryReadingScroll>
            </Group>
          </BottomSheet>
        </Host>
      </View>
    );
  }

  return (
    <Modal
      presentationStyle="pageSheet"
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={local.sheet} onAccessibilityEscape={onClose}>
        <GlassButton name="xmark" label="Voltar à leitura" onPress={onClose} />
        <Text accessibilityRole="header" style={styles.focusTitle}>
          Entrada original
        </Text>
        <ScrollView bounces={false}>{content}</ScrollView>
      </View>
    </Modal>
  );
}

const local = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: 18, backgroundColor: theme.paper },
  content: { gap: 12, paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 },
});
