import type {
  Dispatch,
  RefObject,
  SetStateAction,
  ComponentProps,
} from "react";
import {
  Image,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from "react-native";
import Animated from "react-native-reanimated";
import { selectionAsync } from "expo-haptics";
import { GlassSurface } from "../cookbooks/zest/components/ui/GlassSurface";
import { Symbol, Touch } from "../cookbooks/zest/components/ui/Touch";
import { DiarySaveButton } from "./DiarySaveButton";
import type { DiaryDraft } from "./drafts";
import { styles, theme, interfaceRed } from "./diaryStyles";
const composerMinimum = 108;
const inputMinimum = 42;
const inputMaximum = 116;
type Props = {
  surface: ComponentProps<typeof GlassSurface>["style"];
  expandedContents: ComponentProps<typeof Animated.View>["style"];
  compact: boolean;
  expandedWidth: number;
  setComposerHeight: Dispatch<SetStateAction<number>>;
  setInputHeight: Dispatch<SetStateAction<number>>;
  draft: string;
  input: RefObject<TextInputInstance | null>;
  focused: boolean;
  emptyToday: boolean;
  setDraft: Dispatch<SetStateAction<string>>;
  setComposerFocused: Dispatch<SetStateAction<boolean>>;
  attachmentsOpen: boolean;
  returnToKeyboard: () => void;
  saving: boolean;
  inputHeight: number;
  photo: string | undefined;
  reveal: ComponentProps<typeof Animated.View>["entering"];
  setPhoto: Dispatch<SetStateAction<string | undefined>>;
  focusComposer: () => void;
  showAttachments: (open: boolean) => void;
  picking: boolean;
  save: () => void;
  disabled: boolean;
  previous: DiaryDraft["active"]["previous"];
};
export function DiaryComposer({
  surface,
  expandedContents,
  compact,
  expandedWidth,
  setComposerHeight,
  setInputHeight,
  draft,
  input,
  focused,
  emptyToday,
  setDraft,
  setComposerFocused,
  attachmentsOpen,
  returnToKeyboard,
  saving,
  inputHeight,
  photo,
  reveal,
  setPhoto,
  focusComposer,
  showAttachments,
  picking,
  save,
  disabled,
  previous,
}: Props) {
  return (
    <GlassSurface interactive style={[styles.composerSurface, surface]}>
      <Animated.View
        style={[styles.composerClip, expandedContents]}
        pointerEvents={compact ? "none" : "auto"}
        accessibilityElementsHidden={compact}
        importantForAccessibility={compact ? "no-hide-descendants" : "auto"}
      >
        <View
          style={[styles.composerContents, { width: expandedWidth }]}
          onLayout={({ nativeEvent }) => {
            const height = Math.max(
              composerMinimum,
              Math.ceil(nativeEvent.layout.height),
            );
            setComposerHeight(height);
          }}
        >
          <View>
            {/* Fabric reports the input's content size during layout. Measuring
                      the draft separately lets a fixed-height input request more room. */}
            <Text
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              numberOfLines={7}
              style={[styles.input, styles.inputMeasure]}
              onLayout={({ nativeEvent }) =>
                setInputHeight(
                  Math.max(inputMinimum, Math.ceil(nativeEvent.layout.height)),
                )
              }
            >
              {`${draft}\u200b`}
            </Text>
            <TextInput
              ref={input}
              accessibilityLabel="Texto da entrada"
              placeholder={
                focused
                  ? "Continue seu pensamento…"
                  : emptyToday
                    ? "O que ficou na sua cabeça hoje?"
                    : "Escreva para você…"
              }
              placeholderTextColor={theme.muted}
              value={draft}
              onChangeText={setDraft}
              onFocus={() => {
                setComposerFocused(true);
                if (attachmentsOpen) returnToKeyboard();
              }}
              onBlur={() => setComposerFocused(false)}
              editable={!saving}
              multiline
              submitBehavior="newline"
              keyboardAppearance="light"
              selectionColor={interfaceRed}
              scrollEnabled={!!draft && inputHeight > inputMaximum}
              style={[
                styles.input,
                {
                  height: draft
                    ? Math.min(inputHeight, inputMaximum)
                    : inputMinimum,
                },
              ]}
            />
          </View>
          {photo && (
            <Animated.View entering={reveal} style={styles.attachment}>
              <Image
                accessibilityLabel="Prévia da foto"
                source={{ uri: photo }}
                style={styles.thumbnail}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remover foto"
                onPress={() => {
                  void selectionAsync().catch(() => {});
                  setPhoto(undefined);
                }}
                disabled={saving}
                style={({ pressed }) => [
                  styles.dismiss,
                  styles.photoDismiss,
                  pressed && styles.pressedControl,
                ]}
              >
                <View style={styles.photoDismissIcon}>
                  <Symbol name="xmark" size={12} color={theme.onHeavy} />
                </View>
              </Pressable>
            </Animated.View>
          )}
          <View style={styles.actions}>
            <Touch
              expanded={attachmentsOpen}
              label={attachmentsOpen ? "Voltar ao teclado" : "Abrir anexos"}
              onPress={() => {
                if (attachmentsOpen) focusComposer();
                else {
                  showAttachments(true);
                  Keyboard.dismiss();
                }
              }}
              disabled={saving || picking}
              style={styles.plus}
            >
              <Symbol
                name={attachmentsOpen ? "keyboard" : "plus"}
                size={21}
                color={theme.ink}
              />
            </Touch>
            <DiarySaveButton
              onPress={save}
              disabled={disabled}
              saving={saving}
            />
          </View>
        </View>
      </Animated.View>
      {compact && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Expandir compositor"
          onPress={focusComposer}
          style={styles.compactComposer}
        >
          <Symbol name="square.and.pencil" size={17} color={theme.ink} />
          <Text numberOfLines={1} style={styles.action}>
            {draft || photo || previous
              ? "Continuar rascunho"
              : "Escreva para você…"}
          </Text>
        </Pressable>
      )}
    </GlassSurface>
  );
}
