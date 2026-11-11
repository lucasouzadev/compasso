import { Button, Host, Image, Menu } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  foregroundStyle,
  frame,
  menuIndicator,
} from "@expo/ui/swift-ui/modifiers";
import { MenuView } from "@expo/ui/community/menu";
import { selectionAsync } from "expo-haptics";
import { Symbol } from "../cookbooks/zest/components/ui/Touch";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import {
  GlassSurface,
  useGlassTheme,
  useNativeGlass,
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
  error = false,
  onRetry,
}: {
  tags: string[];
  selected?: string;
  onSelect: (tag?: string) => void;
  ready: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  const theme = useGlassTheme();
  const glass = useNativeGlass();
  const label = selected ? `Filtrar por tag, #${selected}` : "Filtrar por tag";
  const color = selected ? theme.accent : theme.ink;
  const choose = (tag?: string) => {
    onSelect(tag);
    void selectionAsync().catch(() => {});
  };
  const empty = ready ? "Nenhuma tag no diário" : "Carregando tags…";
  const retry = "Tentar carregar tags novamente";
  if (Platform.OS === "ios") {
    return (
      <Host colorScheme="light" ignoreSafeArea="all" style={styles.iconMenu}>
        <Menu
          label={
            <Image
              systemName="line.3.horizontal.decrease"
              size={20}
              modifiers={[
                frame({ width: 14, height: 14 }),
                foregroundStyle(color),
              ]}
            />
          }
          modifiers={[
            buttonStyle(glass ? "glass" : "bordered"),
            buttonBorderShape("circle"),
            controlSize("large"),
            menuIndicator("hidden"),
            accessibilityLabel(label),
          ]}
        >
          <Button
            label="Todas as entradas"
            systemImage={selected ? undefined : "checkmark"}
            onPress={() => choose()}
          />
          {tags.map((tag) => (
            <Button
              key={tag}
              label={`#${tag}`}
              systemImage={selected === tag ? "checkmark" : undefined}
              onPress={() => choose(tag)}
            />
          ))}
          {!tags.length && !error && (
            <Button label={empty} modifiers={[disabled(true)]} />
          )}
          {error && <Button label={retry} onPress={onRetry} />}
        </Menu>
      </Host>
    );
  }
  return (
    <MenuView
      style={styles.iconMenu}
      actions={[
        {
          id: "all",
          title: "Todas as entradas",
          state: selected ? "off" : "on",
        },
        ...tags.map((tag) => ({
          id: `tag:${tag}`,
          title: `#${tag}`,
          state: selected === tag ? ("on" as const) : ("off" as const),
        })),
        ...(!tags.length && !error
          ? [{ title: empty, attributes: { disabled: true } }]
          : []),
        ...(error ? [{ id: "retry", title: retry }] : []),
      ]}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === "retry") onRetry?.();
        else
          choose(
            nativeEvent.event.startsWith("tag:")
              ? nativeEvent.event.slice(4)
              : undefined,
          );
      }}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.iconTrigger}
      >
        <Symbol name="line.3.horizontal.decrease" size={20} color={color} />
      </View>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  iconMenu: { width: 44, height: 44, overflow: "visible" },
  iconTrigger: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F8F7",
    alignItems: "center",
    justifyContent: "center",
  },
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
