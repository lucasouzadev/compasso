import { RNHostView } from "@expo/ui/swift-ui";
import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ReactElement, ReactNode } from "react";
import { Platform, View, type ViewProps } from "react-native";

const native =
  Platform.OS === "ios" && requireOptionalNativeModule("CompassoScrollEdge");
const ScrollEdgeAnchor = native
  ? requireNativeView<
      ViewProps & { scrollIdentifier: string; hardEdge: boolean }
    >("CompassoScrollEdge", "ScrollEdgeAnchor")
  : undefined;
const NativeReadingScroll = native
  ? requireNativeView<{
      title: string;
      onClose: () => void;
      children: ReactNode;
    }>("CompassoScrollEdge", "DiaryReadingScroll")
  : undefined;
export const hasNativeDiaryReading = !!NativeReadingScroll;

export function DiaryScrollEdge({
  children,
  scrollIdentifier,
  hardEdge = false,
  ...props
}: ViewProps & { scrollIdentifier: string; hardEdge?: boolean }) {
  return ScrollEdgeAnchor ? (
    <ScrollEdgeAnchor
      {...props}
      scrollIdentifier={scrollIdentifier}
      hardEdge={hardEdge}
    >
      {children}
    </ScrollEdgeAnchor>
  ) : (
    <View {...props}>{children}</View>
  );
}

export function DiaryReadingScroll({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactElement;
}) {
  return NativeReadingScroll ? (
    <NativeReadingScroll title={title} onClose={onClose}>
      <RNHostView matchContents={{ vertical: true }}>{children}</RNHostView>
    </NativeReadingScroll>
  ) : null;
}
