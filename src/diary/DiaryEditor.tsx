import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  Image,
  Modal,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  type KeyboardAwareScrollViewRef,
} from "react-native-keyboard-controller";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";
import { GlassButton } from "../cookbooks/zest/components/ui/GlassButton";
import { GlassSurface } from "../cookbooks/zest/components/ui/GlassSurface";
import { DiaryScrollEdge } from "./DiaryScrollEdge";
import { Symbol, Touch } from "../cookbooks/zest/components/ui/Touch";
import type { DiaryDraft } from "./drafts";
import { styles, theme, interfaceRed } from "./diaryStyles";
const timeLabel = (value: string) =>
  new Date(value).toLocaleTimeString("pt-BR", { timeStyle: "short" });
const editorToolbarTransition = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.System,
);
type Props = {
  editing: NonNullable<DiaryDraft["editing"]>;
  reducedMotion: boolean;
  editorInput: RefObject<TextInputInstance | null>;
  editorScroll: RefObject<KeyboardAwareScrollViewRef | null>;
  closeEditor: () => void;
  saveEdit: () => void;
  editorHeaderHeight: number;
  editorToolbarHeight: number;
  editorTextHeight: number;
  setEditorTextHeight: Dispatch<SetStateAction<number>>;
  setEditorHeaderHeight: Dispatch<SetStateAction<number>>;
  setEditorToolbarHeight: Dispatch<SetStateAction<number>>;
  saving: boolean;
  picking: boolean;
  editorSaveDisabled: boolean;
  insets: { bottom: number };
  setEditing: Dispatch<SetStateAction<DiaryDraft["editing"]>>;
  attachPhoto: (camera: boolean, target: "editor") => Promise<void>;
};
export function DiaryEditor({
  editing,
  reducedMotion,
  editorInput,
  closeEditor,
  editorScroll,
  editorHeaderHeight,
  editorToolbarHeight,
  setEditorTextHeight,
  saving,
  picking,
  setEditing,
  editorTextHeight,
  setEditorHeaderHeight,
  saveEdit,
  editorSaveDisabled,
  insets,
  setEditorToolbarHeight,
  attachPhoto,
}: Props) {
  return (
    <Modal
      presentationStyle="pageSheet"
      animationType={reducedMotion ? "none" : "slide"}
      onShow={() => editorInput.current?.focus()}
      onRequestClose={closeEditor}
    >
      <GestureHandlerRootView style={styles.fill}>
        <SafeAreaProvider style={styles.editorSurface}>
          <View onAccessibilityEscape={closeEditor} style={styles.fill}>
            <SafeAreaView
              edges={{
                top: "maximum",
                right: "maximum",
                bottom: "maximum",
                left: "maximum",
              }}
              style={styles.editor}
            >
              <View style={styles.editorReadingArea}>
                <KeyboardAwareScrollView
                  testID="compasso-editor-scroll"
                  ref={editorScroll}
                  style={styles.fill}
                  bottomOffset={editorToolbarHeight + 16}
                  disableScrollOnKeyboardHide
                  alwaysBounceVertical={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingTop: editorHeaderHeight + 8,
                    paddingBottom: editorToolbarHeight + 16,
                  }}
                >
                  <View style={styles.editorCard}>
                    <TextInput
                      ref={editorInput}
                      accessibilityLabel="Texto da entrada"
                      placeholder="Escreva para você…"
                      placeholderTextColor={theme.muted}
                      selectionColor={interfaceRed}
                      multiline
                      scrollEnabled={false}
                      onContentSizeChange={({ nativeEvent }) =>
                        setEditorTextHeight(
                          Math.max(
                            148,
                            Math.ceil(nativeEvent.contentSize.height),
                          ),
                        )
                      }
                      onLayout={() =>
                        editorScroll.current?.assureFocusedInputVisible()
                      }
                      editable={!saving && !picking}
                      value={editing.text}
                      onChangeText={(text) =>
                        setEditing((current) => current && { ...current, text })
                      }
                      style={[
                        styles.body,
                        styles.editorInput,
                        { height: editorTextHeight },
                      ]}
                    />
                    {editing.photo && (
                      <Image
                        accessibilityLabel="Foto da entrada"
                        source={{ uri: editing.photo }}
                        style={styles.thumbnail}
                      />
                    )}
                    <TextInput
                      accessibilityLabel="Tags separadas por vírgula"
                      placeholder="Tags, separadas por vírgula"
                      placeholderTextColor={theme.muted}
                      value={editing.tags}
                      onChangeText={(tags) =>
                        setEditing((current) => current && { ...current, tags })
                      }
                      editable={!saving && !picking}
                      autoCapitalize="none"
                      style={styles.editorTags}
                    />
                  </View>
                </KeyboardAwareScrollView>
                <DiaryScrollEdge
                  scrollIdentifier="compasso-editor-scroll"
                  pointerEvents="box-none"
                  onLayout={({ nativeEvent }) =>
                    setEditorHeaderHeight(Math.ceil(nativeEvent.layout.height))
                  }
                  style={styles.editorHeader}
                >
                  <GlassButton
                    name="xmark"
                    label="Cancelar edição"
                    onPress={closeEditor}
                    disabled={saving || picking}
                  />
                  <View style={styles.editorHeading}>
                    <Text accessibilityRole="header" style={styles.editorTitle}>
                      Editar entrada
                    </Text>
                    <Text style={styles.editorDate}>
                      {new Date(editing.entry.createdAt).toLocaleDateString(
                        "pt-BR",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}{" "}
                      · {timeLabel(editing.entry.createdAt)}
                    </Text>
                  </View>
                  <GlassButton
                    name="checkmark"
                    label={saving ? "Salvando alterações" : "Salvar alterações"}
                    onPress={saveEdit}
                    disabled={editorSaveDisabled}
                    prominent
                  />
                </DiaryScrollEdge>
                <KeyboardStickyView
                  offset={{ opened: Math.max(insets.bottom, 12) - 12 }}
                  onLayout={({ nativeEvent }) =>
                    setEditorToolbarHeight(Math.ceil(nativeEvent.layout.height))
                  }
                  pointerEvents="box-none"
                  style={styles.editorToolbarOverlay}
                >
                  <Animated.View layout={editorToolbarTransition}>
                    <GlassSurface
                      interactive
                      materialize={0}
                      style={styles.editorToolbarGlass}
                    >
                      <Touch
                        label={editing.photo ? "Trocar foto" : "Escolher foto"}
                        disabled={saving || picking}
                        onPress={() => void attachPhoto(false, "editor")}
                        style={styles.editorButton}
                      >
                        <Symbol
                          name="photo.on.rectangle"
                          size={20}
                          color={theme.ink}
                        />
                      </Touch>
                      <Touch
                        label="Tirar foto"
                        disabled={saving || picking}
                        onPress={() => void attachPhoto(true, "editor")}
                        style={styles.editorButton}
                      >
                        <Symbol name="camera" size={20} color={theme.ink} />
                      </Touch>
                      {editing.photo && (
                        <Touch
                          label="Remover foto"
                          disabled={saving || picking}
                          onPress={() =>
                            setEditing(
                              (current) =>
                                current && {
                                  ...current,
                                  photo: undefined,
                                },
                            )
                          }
                          style={styles.editorButton}
                        >
                          <Symbol name="trash" size={18} color={interfaceRed} />
                        </Touch>
                      )}
                    </GlassSurface>
                  </Animated.View>
                </KeyboardStickyView>
              </View>
            </SafeAreaView>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}
