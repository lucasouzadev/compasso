import { Button, Host } from "@expo/ui/swift-ui";
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
import { Text, useWindowDimensions } from "react-native";
import { selectionAsync } from "expo-haptics";
import {
  useGlassTheme,
  useNativeGlass,
} from "../cookbooks/zest/components/ui/GlassSurface";
import { Touch } from "../cookbooks/zest/components/ui/Touch";

export function DiarySaveButton({
  onPress,
  disabled,
  saving,
}: {
  onPress: () => void;
  disabled: boolean;
  saving: boolean;
}) {
  const theme = useGlassTheme();
  const native = useNativeGlass();
  const { fontScale, width } = useWindowDimensions();
  const label = saving ? "Guardando…" : "Guardar";
  const buttonWidth = Math.min(
    width - 120,
    (saving ? 132 : 112) * Math.max(1, fontScale),
  );
  if (native) {
    return (
      <Host
        ignoreSafeArea="all"
        colorScheme="light"
        style={{ width: buttonWidth, height: 44 }}
      >
        <Button
          label={label}
          onPress={() => {
            void selectionAsync().catch(() => {});
            onPress();
          }}
          modifiers={[
            buttonStyle("borderedProminent"),
            buttonBorderShape("capsule"),
            controlSize("large"),
            tint(theme.ink),
            foregroundStyle("#FFFFFF"),
            buttonDisabled(disabled),
            accessibilityLabel(label),
            frame({ minWidth: buttonWidth, minHeight: 44 }),
          ]}
        />
      </Host>
    );
  }
  return (
    <Touch
      label={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: buttonWidth,
        minHeight: 44,
        borderRadius: 22,
        backgroundColor: disabled ? theme.muted : theme.ink,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600" }}>
        {label}
      </Text>
    </Touch>
  );
}
