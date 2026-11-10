import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import {
  GlassSurface,
  useGlassTheme,
} from "../cookbooks/zest/components/ui/GlassSurface";

const reveal = FadeIn.duration(140).reduceMotion(ReduceMotion.System);

export function DiaryTagFilter({
  tags,
  selected,
  onSelect,
}: {
  tags: string[];
  selected?: string;
  onSelect: (tag?: string) => void;
}) {
  const theme = useGlassTheme();
  return (
    <GlassSurface style={styles.surface} materialize={0}>
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={styles.row}
      >
        {[undefined, ...tags].map((tag) => (
          <Pressable
            key={tag ?? ""}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === tag }}
            onPress={() => onSelect(tag)}
            style={styles.chip}
          >
            {selected === tag && (
              <Animated.View
                pointerEvents="none"
                entering={reveal}
                style={styles.selected}
              />
            )}
            <Text
              style={{ color: selected === tag ? theme.accent : theme.ink }}
            >
              {tag === undefined ? "Todas" : `#${tag}`}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  surface: { borderRadius: 22 },
  selected: {
    position: "absolute",
    inset: 5,
    borderRadius: 17,
    backgroundColor: "#F2DAD3A6",
  },
  list: { flexGrow: 0 },
  row: { gap: 6, paddingHorizontal: 4 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 22,
  },
});
