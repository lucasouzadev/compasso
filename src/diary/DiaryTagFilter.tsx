import { MenuView } from "@expo/ui/community/menu";
import { selectionAsync } from "expo-haptics";
import { Symbol } from "../cookbooks/zest/components/ui/Touch";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

export function DiaryTagMenu({
  tags,
  selected,
  onSelect,
  ready,
  iconOnly = false,
}: {
  tags: string[];
  selected?: string;
  onSelect: (tag?: string) => void;
  ready: boolean;
  iconOnly?: boolean;
}) {
  const theme = useGlassTheme();
  const label = selected ? `Filtrar por tag, #${selected}` : "Filtrar por tag";
  return (
    <MenuView
      style={iconOnly ? styles.iconMenu : styles.subtitleMenu}
      actions={[
        { id: "", title: "Todas as entradas", state: selected ? "off" : "on" },
        ...tags.map((tag) => ({
          id: tag,
          title: `#${tag}`,
          state: selected === tag ? ("on" as const) : ("off" as const),
        })),
        ...(!tags.length
          ? [
              {
                title: ready ? "Nenhuma tag no diário" : "Carregando tags…",
                attributes: { disabled: true },
              },
            ]
          : []),
      ]}
      onPressAction={({ nativeEvent }) => {
        onSelect(nativeEvent.event || undefined);
        void selectionAsync().catch(() => {});
      }}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        style={iconOnly ? styles.iconTrigger : styles.subtitleTrigger}
      >
        {iconOnly && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <GlassSurface materialize={0} style={styles.iconGlass} />
          </View>
        )}
        <Symbol
          name="line.3.horizontal.decrease"
          size={iconOnly ? 18 : 12}
          color={selected ? theme.accent : theme.muted}
        />
        {!iconOnly && (
          <>
            <Text
              numberOfLines={1}
              style={[
                styles.subtitleText,
                { color: selected ? theme.accent : theme.muted },
              ]}
            >
              {selected ? `#${selected}` : "Filtrar por tag"}
            </Text>
            <Symbol name="chevron.down" size={10} color={theme.muted} />
          </>
        )}
      </View>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  iconMenu: { width: 44, height: 44 },
  iconTrigger: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  iconGlass: { flex: 1, borderRadius: 22 },
  subtitleMenu: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    marginBottom: -15,
  },
  subtitleTrigger: {
    minHeight: 44,
    paddingTop: 2,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  subtitleText: { flexShrink: 1, fontSize: 12 },
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
