import type { ComponentType, ReactElement } from "react";
import { View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import NativeMaskedView from "@react-native-masked-view/masked-view";

// Masked View's declaration extends NativeMethods, removed from the strict API.
const MaskedView = NativeMaskedView as unknown as ComponentType<
  ViewProps & { maskElement: ReactElement }
>;

/**
 * Softens words as they pass beneath the toolbar or composer.
 */
export function ProgressiveBlur({
  height,
  edge,
  color,
  tint = "light",
  singlePass = false,
}: {
  height: number;
  edge: "top" | "bottom";
  color: string;
  tint?: "light" | "dark";
  singlePass?: boolean;
}) {
  const reverse = edge === "bottom";
  const layers = singlePass
    ? [{ intensity: 48, fadeStart: 0.35, fadeEnd: 1 }]
    : [
        { intensity: 10, fadeStart: 0.66, fadeEnd: 1 },
        { intensity: 28, fadeStart: 0.46, fadeEnd: 0.86 },
        { intensity: 66, fadeStart: 0.24, fadeEnd: 0.64 },
      ];
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, right: 0, [edge]: 0, height }}
    >
      {layers.map((layer, index) => (
        <MaskedView
          key={index}
          style={{ position: "absolute", inset: 0 }}
          maskElement={
            <LinearGradient
              colors={
                reverse
                  ? ["transparent", "black", "black"]
                  : ["black", "black", "transparent"]
              }
              locations={
                reverse
                  ? [1 - layer.fadeEnd, 1 - layer.fadeStart, 1]
                  : [0, layer.fadeStart, layer.fadeEnd]
              }
              style={{ flex: 1 }}
            />
          }
        >
          <BlurView
            tint={tint}
            intensity={layer.intensity}
            style={{ flex: 1 }}
          />
        </MaskedView>
      ))}
      <LinearGradient
        colors={
          reverse
            ? [`${color}00`, `${color}66`, `${color}B3`]
            : [`${color}B3`, `${color}66`, `${color}00`]
        }
        locations={reverse ? [0.25, 0.7, 1] : [0, 0.3, 0.75]}
        style={{ position: "absolute", inset: 0 }}
      />
    </View>
  );
}
