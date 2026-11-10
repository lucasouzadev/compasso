import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useGlassTheme } from "../cookbooks/zest/components/ui/GlassSurface";

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
          style={[
            styles.chip,
            {
              backgroundColor: selected === tag ? theme.accent : theme.surface,
            },
          ]}
        >
          <Text style={{ color: selected === tag ? "#FFFFFF" : theme.ink }}>
            {tag === undefined ? "Todas" : `#${tag}`}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 0 },
  row: { gap: 6, paddingVertical: 4 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 22,
  },
});
