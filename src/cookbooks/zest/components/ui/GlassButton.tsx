import { Button, Host, Image } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as buttonDisabled,
  foregroundStyle,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";
import { Symbol, Touch } from "./Touch";
import { GlassSurface, useGlassTheme, useNativeGlass } from "./GlassSurface";

type Icon = NonNullable<React.ComponentProps<typeof Button>["systemImage"]>;

/**
 * A round control that is the system's own glass button, so the press, the
 * highlight and the release are the platform's and not an imitation of them.
 */
export function GlassButton({
  name,
  label,
  onPress,
  size = 44,
  disabled = false,
  prominent = false,
}: {
  name: Icon;
  label: string;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  prominent?: boolean;
}) {
  const theme = useGlassTheme();
  const native = useNativeGlass();
  if (native)
    return (
      <Host
        colorScheme="light"
        ignoreSafeArea="all"
        style={{ width: size, height: size, overflow: "visible" }}
      >
        <Button
          onPress={() => {
            void Haptics.selectionAsync();
            onPress();
          }}
          modifiers={[
            buttonStyle(prominent ? "glassProminent" : "glass"),
            buttonDisabled(disabled),
            ...(prominent ? [tint(theme.accent)] : []),
            buttonBorderShape("circle"),
            controlSize(size < 44 ? "regular" : "large"),
            accessibilityLabel(label),
            foregroundStyle(prominent ? "#FFFFFF" : theme.ink),
          ]}
        >
          <Image
            systemName={name}
            size={18}
            modifiers={[frame({ width: size - 30, height: size - 30 })]}
          />
        </Button>
      </Host>
    );
  return (
    <Touch label={label} onPress={onPress} disabled={disabled} expand>
      <GlassSurface
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          ...(prominent && { backgroundColor: theme.accent }),
          ...(disabled && { opacity: 0.4 }),
        }}
      >
        <Symbol
          name={name}
          size={20}
          color={prominent ? "#FFFFFF" : theme.ink}
        />
      </GlassSurface>
    </Touch>
  );
}
