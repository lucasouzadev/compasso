import type { DiaryDraft } from "./drafts";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ComponentProps,
} from "react";
import {
  Alert,
  AppState,
  BackHandler,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputInstance,
  type FlatListInstance,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  KeyboardAvoidingView,
  KeyboardController,
  KeyboardEvents,
  KeyboardStickyView,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import Animated, {
  FadeIn,
  FadeInRight,
  FadeInDown,
  FadeOut,
  LinearTransition,
  Easing,
  ReduceMotion,
  useDerivedValue,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
} from "expo-image-picker";
import { selectionAsync } from "expo-haptics";
import { setStringAsync } from "expo-clipboard";
import { requireOptionalNativeModule } from "expo";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import {
  EntryActions,
  type BubbleBounds,
  type ContextPointer,
  type DiaryMenuAction,
} from "./EntryActions";
import { dayKey, parseDay } from "../cookbooks/zest/data/diary";
import { GlassButton } from "../cookbooks/zest/components/ui/GlassButton";
import { ZestChatScroll } from "../cookbooks/zest/components/ChatScroll";
import { ProgressiveBlur } from "../cookbooks/zest/components/ui/ProgressiveBlur";
import { Symbol, Touch } from "../cookbooks/zest/components/ui/Touch";
import { DiaryEntryBody } from "./DiaryEntryBody";
import { DiarySaveButton } from "./DiarySaveButton";
import {
  GlassSurface,
  GlassThemeProvider,
} from "../cookbooks/zest/components/ui/GlassSurface";
import { theme as zestTheme } from "../cookbooks/zest/theme";
import { DiaryCalendar } from "./DiaryCalendar";
import { DiarySearch } from "./DiarySearch";
import {
  parseDiaryTags,
  quotedEntryText,
  threadEntryIds,
  type Entry,
} from "./entries";
import {
  deleteEntries,
  setEntryReaction,
  editEntry,
  entryPhotoUri,
  readDay,
  readDayIndex,
  readEntry,
  readThreadLinks,
  rememberDay,
  saveEntry,
  draftJournal,
  keepDraftPhoto,
  newEntryId,
  toggleEntryFavorite,
} from "./storage";

const textRecognition =
  Platform.OS === "ios"
    ? requireOptionalNativeModule<{ recognize(uri: string): Promise<string> }>(
        "CompassoTextRecognition",
      )
    : null;

function loadDraft() {
  try {
    const draft = draftJournal.read();
    if (draft?.submissionId && readEntry(draft.submissionId)) {
      return {
        draft: { ...draft, active: { text: "" }, submissionId: undefined },
        failed: false,
      };
    }
    return { draft, failed: false };
  } catch {
    return { draft: undefined, failed: true };
  }
}

const dateLabel = (day: string) =>
  parseDay(day).toLocaleDateString("pt-BR", { dateStyle: "full" });
const timeLabel = (value: string) =>
  new Date(value).toLocaleTimeString("pt-BR", { timeStyle: "short" });
const composerMinimum = 108;
const compactHeight = 48;
const historyThreshold = 96;
const bubbleRed = "#F8DFDB";
const interfaceRed = "#D6281E";
const theme = {
  ...zestTheme,
  paper: "#F7F2E8",
  ink: "#111111",
  muted: "#706C67",
  accent: interfaceRed,
};
const motionCurve = Easing.bezier(0.22, 0.7, 0.22, 1);
const inputMinimum = 42;
const inputMaximum = 116;
const defaultAttachmentHeight = 300;
const readingAnchor = { minIndexForVisible: 0, autoscrollToTopThreshold: 24 };
const reveal = FadeIn.duration(160).reduceMotion(ReduceMotion.System);
const editorToolbarTransition = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.System,
);
const hideEmpty = FadeOut.duration(150).reduceMotion(ReduceMotion.System);
const focusEnter = FadeIn.duration(250).reduceMotion(ReduceMotion.System);
const focusExit = FadeOut.duration(200).reduceMotion(ReduceMotion.System);
const entryArrival = FadeInRight.duration(280).reduceMotion(
  ReduceMotion.System,
);

function BubbleShape({ width, height }: { width: number; height: number }) {
  const contour = useMemo(() => {
    const edge = width - 6;
    const radius = Math.min(17, edge / 2, height / 2);
    if (radius <= 0) return undefined;

    return Skia.Path.MakeFromSVGString(
      [
        `M ${radius} 0 H ${edge - radius}`,
        `Q ${edge} 0 ${edge} ${radius} V ${height - radius}`,
        `C ${edge} ${height - 9} ${edge + 1} ${height - 4} ${width} ${height - 3}`,
        `C ${edge + 3} ${height} ${edge - 4} ${height - 1} ${edge - 8} ${height - 4}`,
        `Q ${edge - 12} ${height} ${edge - radius} ${height} H ${radius}`,
        `Q 0 ${height} 0 ${height - radius} V ${radius} Q 0 0 ${radius} 0 Z`,
      ].join(" "),
    );
  }, [height, width]);

  if (!contour) return null;
  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Path path={contour} color={bubbleRed} />
    </Canvas>
  );
}

function EntryCard({
  allowSwipe = true,
  entry,
  previous,
  onContinue,
  onOpenOriginal,
  onEdit,
  selected,
  onToggle,
  onDelete,
  onFavorite,
  onReact,
  menuActive,
  onOpenMenu,
}: {
  entry: Entry;
  allowSwipe?: boolean;
  previous?: Entry;
  onContinue: () => void;
  onOpenOriginal: (entry: Entry) => void;
  onEdit: () => void;
  selected?: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onReact: (emoji: string) => void;
  menuActive: boolean;
  onOpenMenu: (
    menu: Omit<ComponentProps<typeof EntryActions>, "onClose">,
  ) => void;
}) {
  const photo = entryPhotoUri(entry);
  const pointer = useSharedValue<ContextPointer>({ x: 0, y: 0, phase: "idle" });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const bubbleRef = useRef<ComponentRef<typeof View>>(null);
  const swipe = useSharedValue(0);
  const armed = useSharedValue(false);
  function openActions(position: BubbleBounds) {
    const writingActions: DiaryMenuAction[] = [
      ...(allowSwipe
        ? [
            {
              title: "Continuar",
              icon: "arrowshape.turn.up.left.fill" as const,
              onPress: onContinue,
            },
          ]
        : []),
      { title: "Editar", icon: "pencil", onPress: onEdit },
      { title: "Excluir", icon: "trash", destructive: true, onPress: onDelete },
    ];
    const otherActions: DiaryMenuAction[] = [
      {
        title: entry.favorite ? "Remover dos favoritos" : "Favoritar",
        icon: entry.favorite ? "bookmark.fill" : "bookmark",
        onPress: onFavorite,
      },
      ...(entry.text
        ? [
            {
              title: "Copiar texto",
              icon: "doc.on.doc" as const,
              onPress: () => {
                void setStringAsync(entry.text).catch(() =>
                  Alert.alert("Não foi possível copiar o texto."),
                );
              },
            },
          ]
        : []),
      ...(entry.text || (Platform.OS === "ios" && photo)
        ? [
            {
              title: "Compartilhar",
              icon: "square.and.arrow.up" as const,
              onPress: () => {
                void Share.share({
                  message: entry.text,
                  ...(Platform.OS === "ios" && photo ? { url: photo } : {}),
                }).catch(() =>
                  Alert.alert("Não foi possível compartilhar a entrada."),
                );
              },
            },
          ]
        : []),
    ];
    if (Platform.OS === "ios") {
      if (position.width <= 0 || position.height <= 0) return;
      void selectionAsync().catch(() => {});
      Keyboard.dismiss();
      onOpenMenu({
        bounds: position,
        pointer,
        reaction: entry.reaction,
        onReact,
        actions: [
          ...writingActions.slice(0, -2),
          ...otherActions,
          ...writingActions.slice(-2),
        ],
        children: (
          <View style={[styles.entry, size]}>
            <BubbleShape {...size} />
            {content}
          </View>
        ),
      });
    } else {
      const showActions = (actions: DiaryMenuAction[]) =>
        Alert.alert(
          "Ações da entrada",
          undefined,
          actions.map((action) => ({
            text: action.title,
            style: action.destructive ? "destructive" : "default",
            onPress: action.onPress,
          })),
          { cancelable: true },
        );
      Alert.alert(
        "Ações da entrada",
        undefined,
        [
          {
            text: allowSwipe ? "Editar ou continuar" : "Editar ou excluir",
            onPress: () => showActions(writingActions),
          },
          {
            text: "Favoritos e compartilhamento",
            onPress: () => showActions(otherActions),
          },
        ],
        { cancelable: true },
      );
    }
  }
  function replyHaptic() {
    if (Platform.OS === "ios") void selectionAsync().catch(() => {});
  }
  const holdAndDrag = Gesture.Pan()
    .activateAfterLongPress(450)
    .maxPointers(1)
    .onStart(({ x, y, absoluteX, absoluteY }) => {
      pointer.set({ x: absoluteX, y: absoluteY, phase: "idle" });
      scheduleOnRN(openActions, {
        x: absoluteX - x,
        y: absoluteY - y,
        width: size.width,
        height: size.height,
      });
    })
    .onUpdate(({ absoluteX, absoluteY, translationX, translationY }) => {
      if (
        pointer.get().phase === "moving" ||
        Math.hypot(translationX, translationY) >= 12
      ) {
        pointer.set({ x: absoluteX, y: absoluteY, phase: "moving" });
      }
    })
    .onEnd(({ absoluteX, absoluteY }, success) => {
      pointer.set({
        x: absoluteX,
        y: absoluteY,
        phase:
          success && pointer.get().phase === "moving" ? "released" : "idle",
      });
    });
  const longPress = Gesture.LongPress()
    .maxDistance(10)
    .onStart(({ x, y, absoluteX, absoluteY }) => {
      scheduleOnRN(openActions, {
        x: absoluteX - x,
        y: absoluteY - y,
        width: size.width,
        height: size.height,
      });
    });
  const bubbleMotion = useAnimatedStyle(() => ({
    transform: [{ translateX: swipe.get() }],
  }));
  const replyHint = useAnimatedStyle(() => ({
    opacity: Math.min(1, -swipe.get() / 52),
    transform: [{ scale: 0.65 + 0.35 * Math.min(1, -swipe.get() / 52) }],
  }));
  const pullReply = Gesture.Pan()
    .enabled(allowSwipe)
    .activeOffsetX(-14)
    .failOffsetY([-12, 12])
    .onStart(() => armed.set(false))
    .onUpdate(({ translationX }) => {
      const distance = Math.max(0, -translationX);
      swipe.set(
        -Math.min(80, distance <= 52 ? distance : 52 + (distance - 52) * 0.35),
      );
      if (distance >= 52 && !armed.get()) {
        armed.set(true);
        scheduleOnRN(replyHaptic);
      }
    })
    .onEnd(({ translationX, velocityX }, finished) => {
      if (
        finished &&
        (translationX <= -52 || (translationX < -30 && velocityX < -600))
      ) {
        if (!armed.get()) scheduleOnRN(replyHaptic);
        scheduleOnRN(onContinue);
      }
    })
    .onFinalize(() => {
      swipe.set(
        withSpring(0, {
          damping: 24,
          stiffness: 260,
          reduceMotion: ReduceMotion.System,
        }),
      );
    });
  const gestures = Gesture.Race(
    pullReply,
    Platform.OS === "ios" ? holdAndDrag : longPress,
  );
  const openOriginal =
    previous && selected === undefined
      ? () => onOpenOriginal(previous)
      : undefined;
  const quote = quotedEntryText(entry, previous);
  const content = (
    <DiaryEntryBody
      entry={entry}
      previous={previous}
      onOpenOriginal={openOriginal ? onOpenOriginal : undefined}
    />
  );
  const bubble = (
    <Animated.View
      ref={bubbleRef}
      collapsable={false}
      accessible={selected === undefined}
      accessibilityActions={
        selected === undefined
          ? [
              { name: "menu", label: "Ações da entrada" },
              ...(openOriginal
                ? [{ name: "original", label: "Ver entrada original" }]
                : []),
            ]
          : undefined
      }
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === "original") {
          openOriginal?.();
          return;
        }
        pointer.set({ x: 0, y: 0, phase: "idle" });
        bubbleRef.current?.measureInWindow((x, y, width, height) =>
          openActions({ x, y, width, height }),
        );
      }}
      onLayout={({ nativeEvent: { layout } }) => {
        setSize((current) =>
          current.width === layout.width && current.height === layout.height
            ? current
            : { width: layout.width, height: layout.height },
        );
      }}
      style={[
        styles.entry,
        bubbleMotion,
        menuActive && styles.hiddenBubble,
        (photo || quote !== undefined) && styles.mediaEntry,
      ]}
    >
      <BubbleShape {...size} />
      {content}
    </Animated.View>
  );
  return (
    <View
      style={[styles.entryRow, selected !== undefined && styles.selectableRow]}
    >
      <View style={styles.entryMetadata}>
        {entry.favorite && (
          <Symbol name="bookmark.fill" size={12} color={interfaceRed} />
        )}
        <Text style={styles.entryTime}>{timeLabel(entry.createdAt)}</Text>
      </View>
      {selected === undefined ? (
        <>
          {allowSwipe && (
            <Animated.View
              pointerEvents="none"
              style={[styles.swipeHint, replyHint]}
            >
              <Symbol
                name="arrowshape.turn.up.left.fill"
                size={21}
                color={interfaceRed}
              />
            </Animated.View>
          )}
          <GestureDetector gesture={gestures}>{bubble}</GestureDetector>
        </>
      ) : (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
          onPress={onToggle}
        >
          <View style={styles.selectionIndicator}>
            <Symbol
              name={selected ? "checkmark.circle.fill" : "circle"}
              size={24}
              color={selected ? interfaceRed : theme.muted}
            />
          </View>
          {bubble}
        </Pressable>
      )}
    </View>
  );
}

function loadJournal(): {
  index: Map<string, string[]>;
  status: "ready" | "error";
} {
  try {
    const index = readDayIndex();
    const today = dayKey();
    if (!index.has(today)) index.set(today, []);
    return { index, status: "ready" };
  } catch {
    return { index: new Map(), status: "error" };
  }
}

export function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const expandedWidth = width - 32;
  const [{ index, status: indexStatus }, setJournal] = useState(loadJournal);
  const [today, setToday] = useState(dayKey);
  const [historicalDay, setHistoricalDay] = useState<string>();
  const activeDay = historicalDay ?? today;
  const writingToday = activeDay === today;
  const [recovery] = useState(loadDraft);
  const [draft, setDraft] = useState(recovery.draft?.active.text ?? "");
  const [photo, setPhoto] = useState<string | undefined>(
    recovery.draft?.active.photo,
  );
  const [previous, setPrevious] = useState<Entry | undefined>(
    recovery.draft?.active.previous,
  );
  const [editing, setEditing] = useState<DiaryDraft["editing"]>(
    recovery.draft?.editing,
  );
  const [original, setOriginal] = useState<Entry>();
  const closeOriginal = () => setOriginal(undefined);
  const [focusSeed, setFocusSeed] = useState<Entry | undefined>(
    recovery.draft?.focus,
  );
  const [threadLinks, setThreadLinks] = useState<Map<string, string>>();
  const [selection, setSelection] = useState<Set<string>>();
  const [entryMenu, setEntryMenu] = useState<{
    id: string;
    props: Omit<ComponentProps<typeof EntryActions>, "onClose">;
  }>();
  const closeEntryMenu = useCallback(() => setEntryMenu(undefined), []);
  const showComposer = !selection && (writingToday || !!focusSeed);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [arriving, setArriving] = useState<string>();
  const [newIdeas, setNewIdeas] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(88);
  const [focusHeaderHeight, setFocusHeaderHeight] = useState(72);
  const [editorHeaderHeight, setEditorHeaderHeight] = useState(62);
  const [inputHeight, setInputHeight] = useState(inputMinimum);
  const [composerHeight, setComposerHeight] = useState(composerMinimum);
  const [readingHistory, setReadingHistory] = useState(false);
  const [keepComposerOpen, setKeepComposerOpen] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const compact =
    readingHistory &&
    !keepComposerOpen &&
    !composerFocused &&
    !focusSeed &&
    !attachmentsOpen &&
    !saving &&
    !picking;
  const expandedHeight = useSharedValue(composerMinimum);
  const morph = useSharedValue(0);
  const compactProgress = useDerivedValue(() =>
    Math.max(0, Math.min(1, morph.get())),
  );
  const surfaceHeight = useDerivedValue(
    () =>
      expandedHeight.get() * (1 - compactProgress.get()) +
      compactHeight * compactProgress.get(),
  );
  const calendarProgress = useSharedValue(0);
  const attachmentReserve = useSharedValue(0);
  const dragStartHeight = useSharedValue(0);
  const { height: keyboardHeight, progress: keyboardProgress } =
    useReanimatedKeyboardAnimation();
  const attachmentInset = useDerivedValue(() => {
    // Match KeyboardStickyView's translation, including its open safe-area offset.
    const keyboardLift =
      -keyboardHeight.get() - keyboardProgress.get() * insets.bottom;
    return Math.max(0, attachmentReserve.get() - Math.max(0, keyboardLift));
  });
  const attachmentPanel = useAnimatedStyle(() => ({
    height: attachmentInset.get(),
  }));
  const readingInset = useDerivedValue(() =>
    showComposer
      ? attachmentInset.get() + Math.max(0, surfaceHeight.get() - compactHeight)
      : 0,
  );
  const surface = useAnimatedStyle(() => ({
    height: surfaceHeight.get(),
    width: expandedWidth * (1 - 0.14 * compactProgress.get()),
  }));
  const expandedContents = useAnimatedStyle(() => ({
    opacity: 1 - compactProgress.get(),
  }));
  const dock = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          calendarProgress.get() * (surfaceHeight.get() + insets.bottom + 34),
      },
    ],
  }));
  const transcript = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, Math.min(1, calendarProgress.get())) * 0.82,
  }));
  const busy = useRef(false);
  const closingCalendar = useRef(false);
  const focusAfterCalendar = useRef(false);
  const input = useRef<TextInputInstance>(null);
  const editorInput = useRef<TextInputInstance>(null);
  const timeline = useRef<FlatListInstance>(null);
  const threadList = useRef<FlatListInstance>(null);
  const followThread = useRef(false);
  const atTop = useRef(true);
  const history = useRef(false);
  const lastDay = useRef(today);
  const reducedMotion = useReducedMotion();
  const lastKeyboardHeight = useRef(0);
  const keyboardHandoff = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const outsideFocus = useRef<{
    text: string;
    photo?: string;
    previous?: Entry;
  }>(recovery.draft?.outside);
  const submissionId = useRef(recovery.draft?.submissionId);
  const draftWarning = useRef(false);
  const draftState = {
    version: 1 as const,
    active: { text: draft, photo, previous },
    outside: outsideFocus.current,
    focus: focusSeed,
    editing,
    submissionId: submissionId.current,
  };
  const latestDraft = useRef(draftState);
  latestDraft.current = draftState;

  const persistDraft = useCallback(() => {
    if (recovery.failed) return;
    try {
      draftJournal.write(latestDraft.current);
      draftWarning.current = false;
    } catch {
      if (!draftWarning.current) {
        draftWarning.current = true;
        Alert.alert(
          "Não foi possível proteger o rascunho",
          "Mantenha o app aberto e guarde sua entrada para preservar o conteúdo.",
        );
      }
    }
  }, [recovery.failed]);

  useEffect(() => {
    submissionId.current = undefined;
    latestDraft.current.submissionId = undefined;
    persistDraft();
  }, [draft, photo, previous, focusSeed, editing, persistDraft]);

  useEffect(() => {
    if (recovery.failed)
      Alert.alert(
        "Não foi possível recuperar o rascunho",
        "Os registros guardados continuam disponíveis. O rascunho anterior precisa ser recuperado antes de ativar o salvamento automático.",
      );
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") persistDraft();
    });
    return () => subscription.remove();
  }, [persistDraft, recovery.failed]);

  useEffect(() => {
    expandedHeight.set(
      withTiming(composerHeight, {
        duration: 230,
        easing: motionCurve,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [composerHeight, expandedHeight]);

  useEffect(() => {
    morph.set(
      withSpring(compact ? 1 : 0, {
        damping: 30,
        stiffness: 200,
        mass: 1,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [compact, morph]);

  useEffect(() => {
    const refreshDay = () => {
      const day = dayKey();
      if (day === lastDay.current) return;
      lastDay.current = day;
      setToday(day);
      if (!historicalDay) {
        atTop.current = true;
        history.current = false;
        setReadingHistory(false);
        setNewIdeas(0);
      }
      setJournal((journal) =>
        journal.index.has(day)
          ? journal
          : {
              ...journal,
              index: new Map(journal.index).set(day, []),
            },
      );
    };
    const timer = setInterval(refreshDay, 60_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshDay();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [historicalDay]);

  useEffect(() => {
    const subscription = KeyboardEvents.addListener(
      "keyboardDidShow",
      ({ height }) => {
        if (height > 0) lastKeyboardHeight.current = height;
        if (keyboardHandoff.current !== undefined) {
          clearTimeout(keyboardHandoff.current);
          keyboardHandoff.current = undefined;
          attachmentReserve.set(
            withTiming(0, { duration: 160, reduceMotion: ReduceMotion.System }),
          );
        }
      },
    );
    return () => {
      subscription.remove();
      clearTimeout(keyboardHandoff.current);
    };
  }, [attachmentReserve]);

  useEffect(() => {
    try {
      rememberDay(today);
    } catch {
      /* An empty day can be recorded on the next launch. */
    }
  }, [today]);

  const page = useMemo(() => {
    try {
      return { entries: readDay(index.get(activeDay) ?? []), failed: false };
    } catch {
      return { entries: [] as Entry[], failed: true };
    }
  }, [activeDay, index]);
  const { entries } = page;
  const status = page.failed ? "error" : indexStatus;
  const byId = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries],
  );
  const dates = useMemo(
    () => [...new Set([...index.keys(), today])].sort().reverse(),
    [index, today],
  );
  const pageIndex = dates.indexOf(activeDay);
  const focused = !!focusSeed;
  const focusArrival = useMemo(
    () => FadeInDown.duration(260).reduceMotion(ReduceMotion.System),
    [],
  );
  useEffect(() => {
    if (!focused || threadLinks) return;
    const abort = new AbortController();
    void readThreadLinks([...index.values()].flat(), abort.signal).then(
      (links) => {
        if (!abort.signal.aborted) {
          followThread.current = true;
          setThreadLinks(links);
        }
      },
    );
    return () => abort.abort();
  }, [focused, index, threadLinks]);

  const threadEntries = useMemo(() => {
    if (!focusSeed) return [];
    if (!threadLinks) return [focusSeed];
    try {
      const linked = readDay(threadEntryIds(focusSeed.id, threadLinks));
      return linked.length ? linked : [focusSeed];
    } catch {
      return [focusSeed];
    }
  }, [focusSeed, threadLinks]);

  function continueThought(entry: Entry) {
    if (busy.current) return;
    if (editing) {
      Alert.alert(
        "Edição em andamento",
        "Guarde ou cancele a edição atual antes de continuar outro pensamento.",
      );
      return;
    }
    if (!focusSeed) {
      outsideFocus.current = { text: draft, photo, previous };
      setDraft("");
      setPhoto(undefined);
      followThread.current = true;
      setFocusSeed(entry);
    }
    setPrevious(entry);
    focusComposer();
  }

  function leaveFocus() {
    const saved = outsideFocus.current;
    outsideFocus.current = undefined;
    showAttachments(false);
    Keyboard.dismiss();
    setFocusSeed(undefined);
    setEditing(undefined);
    setDraft(saved?.text ?? "");
    setPhoto(saved?.photo);
    setPrevious(saved?.previous);
  }

  function closeFocus() {
    if (busy.current) return;
    if (selection) {
      setSelection(undefined);
      return;
    }
    if (draft.trim() || photo) {
      Alert.alert(
        "Sair do modo foco?",
        "O rascunho desta continuação será descartado.",
        [
          { text: "Continuar escrevendo", style: "cancel" },
          {
            text: "Descartar e sair",
            style: "destructive",
            onPress: leaveFocus,
          },
        ],
      );
    } else leaveFocus();
  }

  function openDay(day: string) {
    if (
      busy.current ||
      editing ||
      day === activeDay ||
      (day !== today && !index.has(day))
    )
      return;
    Keyboard.dismiss();
    showAttachments(false);
    setHistoricalDay(day === today ? undefined : day);
    setNewIdeas(0);
    atTop.current = true;
    history.current = false;
    setReadingHistory(false);
    setKeepComposerOpen(false);
  }

  function openCalendar() {
    showAttachments(false);
    Keyboard.dismiss();
    setCalendar(true);
    calendarProgress.set(
      withSpring(1, { damping: 26, stiffness: 180, mass: 0.9 }),
    );
  }

  function closeCalendar() {
    if (closingCalendar.current) return;
    closingCalendar.current = true;
    calendarProgress.set(
      withSpring(0, { damping: 27, stiffness: 230, mass: 0.85 }, (finished) => {
        if (finished) scheduleOnRN(finishCalendarClose);
      }),
    );
  }

  function finishCalendarClose() {
    setCalendar(false);
    closingCalendar.current = false;
    if (focusAfterCalendar.current) {
      focusAfterCalendar.current = false;
      input.current?.focus();
    }
  }

  useEffect(() => {
    if (!calendar && !attachmentsOpen && !focusSeed && !selection) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (selection && !calendar) setSelection(undefined);
        else if (calendar) closeCalendar();
        else if (attachmentsOpen) showAttachments(false);
        else closeFocus();
        return true;
      },
    );
    return () => subscription.remove();
  });

  function focusComposer() {
    setKeepComposerOpen(true);
    if (calendar) {
      showAttachments(false);
      focusAfterCalendar.current = true;
      closeCalendar();
    } else {
      if (attachmentsOpen) returnToKeyboard();
      input.current?.focus();
    }
  }

  function startEditing(entry: Entry) {
    if (busy.current || editing) return;
    Keyboard.dismiss();
    setEditing({
      entry,
      text: entry.text,
      photo: entryPhotoUri(entry),
      tags: entry.tags?.join(", ") ?? "",
    });
  }

  function closeEditor() {
    if (busy.current || !editing) return;
    const discard = () => {
      Keyboard.dismiss();
      setEditing(undefined);
    };
    const changed =
      editing.text !== editing.entry.text ||
      editing.photo !== entryPhotoUri(editing.entry) ||
      editing.tags !== (editing.entry.tags?.join(", ") ?? "");
    if (changed) {
      Alert.alert(
        "Descartar alterações?",
        "A entrada guardada será preservada.",
        [
          { text: "Continuar editando", style: "cancel" },
          {
            text: "Descartar alterações",
            style: "destructive",
            onPress: discard,
          },
        ],
      );
    } else discard();
  }

  async function saveEdit() {
    if (busy.current || !editing || status !== "ready") return;
    const text = editing.text.trim();
    if (!text && !editing.photo) return;

    busy.current = true;
    setSaving(true);
    try {
      const updated = await editEntry(
        editing.entry,
        text,
        editing.photo,
        parseDiaryTags(editing.tags),
      );
      setJournal((current) => ({ ...current, index: new Map(current.index) }));
      setThreadLinks((links) => links && new Map(links));
      setFocusSeed((seed) => (seed?.id === updated.id ? updated : seed));
      Keyboard.dismiss();
      setEditing(undefined);
    } catch {
      Alert.alert(
        "Não foi possível salvar as alterações",
        "As alterações continuam no editor. Tente novamente.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  function showAttachments(open: boolean) {
    clearTimeout(keyboardHandoff.current);
    keyboardHandoff.current = undefined;
    setAttachmentsOpen(open);
    const visibleHeight = KeyboardController.isVisible()
      ? KeyboardController.state().height
      : 0;
    const keyboardSize = visibleHeight || lastKeyboardHeight.current;
    const target =
      keyboardSize > 0
        ? Math.max(0, keyboardSize - insets.bottom)
        : defaultAttachmentHeight;
    if (open && visibleHeight > 0) {
      // Reserve the keyboard's full lift before starting its dismissal.
      attachmentReserve.set(target);
    } else {
      attachmentReserve.set(
        withTiming(open ? target : 0, {
          duration: 230,
          reduceMotion: ReduceMotion.System,
        }),
      );
    }
  }

  function closeAttachments() {
    showAttachments(false);
  }

  const pullTray = Gesture.Pan()
    .enabled(attachmentsOpen)
    .activeOffsetY(10)
    .onStart(() => dragStartHeight.set(attachmentReserve.get()))
    .onUpdate(({ translationY }) => {
      attachmentReserve.set(
        Math.max(0, dragStartHeight.get() - Math.max(0, translationY)),
      );
    })
    .onEnd(({ translationY, velocityY }, finished) => {
      if (finished && (translationY > 56 || velocityY > 650)) {
        scheduleOnRN(closeAttachments);
      } else {
        attachmentReserve.set(
          withTiming(dragStartHeight.get(), {
            duration: 160,
            reduceMotion: ReduceMotion.System,
          }),
        );
      }
    });

  function returnToKeyboard() {
    setAttachmentsOpen(false);
    clearTimeout(keyboardHandoff.current);
    // Keep the dock pinned until the keyboard has taken over. The timeout
    // also releases it when a hardware keyboard prevents a show event.
    keyboardHandoff.current = setTimeout(() => showAttachments(false), 700);
  }

  async function attachPhoto(
    camera: boolean,
    target: "composer" | "editor" | "text" = "composer",
  ) {
    if (busy.current) return;
    busy.current = true;
    setPicking(true);
    if (target !== "editor") showAttachments(false);
    else Keyboard.dismiss();
    try {
      if (camera && !(await requestCameraPermissionsAsync()).granted) {
        Alert.alert(
          "Acesso à câmera",
          "Permita o acesso à câmera nos Ajustes do iPhone para tirar uma foto.",
        );
        return;
      }
      const picker = camera ? launchCameraAsync : launchImageLibraryAsync;
      const result = await picker({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (!result.canceled) {
        const uri = result.assets[0]?.uri;
        if (target === "text") {
          if (!textRecognition || !uri) return;
          const recognized = (await textRecognition.recognize(uri)).trim();
          if (!recognized) {
            Alert.alert(
              "Nenhum texto encontrado",
              "Tire outra foto com o texto bem iluminado e em foco.",
            );
            return;
          }
          setDraft((current) =>
            current.trim()
              ? `${current.trimEnd()}\n\n${recognized}`
              : recognized,
          );
          focusComposer();
        } else {
          const retainedPhoto = uri ? keepDraftPhoto(uri) : undefined;
          if (target === "editor") {
            setEditing(
              (current) => current && { ...current, photo: retainedPhoto },
            );
          } else {
            setPhoto(retainedPhoto);
            setKeepComposerOpen(true);
          }
        }
      }
    } catch {
      Alert.alert(
        target === "text"
          ? "Não foi possível capturar o texto"
          : camera
            ? "Não foi possível abrir a câmera"
            : "Não foi possível abrir as fotos",
        "Tente novamente.",
      );
    } finally {
      busy.current = false;
      setPicking(false);
    }
  }

  async function save() {
    const text = draft.trim();
    if (
      busy.current ||
      status !== "ready" ||
      !!editing ||
      (!writingToday && !focusSeed) ||
      (!text && !photo)
    )
      return;
    busy.current = true;
    setSaving(true);
    try {
      showAttachments(false);
      if (!focusSeed) await KeyboardController.dismiss();
      submissionId.current ??= newEntryId();
      draftJournal.write({
        ...latestDraft.current,
        submissionId: submissionId.current,
      });
      const entry = await saveEntry(
        text,
        photo,
        previous ?? focusSeed,
        submissionId.current,
      );
      submissionId.current = undefined;
      setArriving(entry.id);
      if (focusSeed) followThread.current = true;
      else if (!atTop.current) setNewIdeas((count) => count + 1);
      if (entry.continuationOf) {
        const parent = entry.continuationOf;
        setThreadLinks((links) =>
          links ? new Map(links).set(entry.id, parent) : links,
        );
      }
      setJournal((current) => {
        const updated = new Map(current.index);
        const day = dayKey(new Date(entry.createdAt));
        updated.set(day, [entry.id, ...(updated.get(day) ?? [])]);
        return { ...current, index: updated };
      });
      setToday(dayKey());
      setDraft("");
      setPhoto(undefined);
      if (!focusSeed) setPrevious(undefined);
    } catch {
      Alert.alert(
        "Não foi possível guardar",
        "Sua entrada ainda está no campo. Tente novamente.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  function quotedSource(id?: string) {
    if (!id) return undefined;
    try {
      return byId.get(id) ?? readEntry(id);
    } catch {
      return undefined;
    }
  }

  async function react(entry: Entry, emoji: string) {
    if (busy.current) return;
    busy.current = true;
    try {
      await setEntryReaction(entry.id, emoji);
      setJournal((current) => ({ ...current, index: new Map(current.index) }));
      setThreadLinks((links) => links && new Map(links));
    } catch {
      Alert.alert("Não foi possível guardar a reação");
    } finally {
      busy.current = false;
    }
  }

  async function favorite(entry: Entry) {
    if (busy.current) return;
    busy.current = true;
    try {
      const updated = await toggleEntryFavorite(entry.id);
      setJournal((current) => ({ ...current, index: new Map(current.index) }));
      setThreadLinks((links) => links && new Map(links));
      setFocusSeed((seed) => (seed?.id === updated.id ? updated : seed));
      void selectionAsync().catch(() => {});
    } catch {
      Alert.alert("Não foi possível atualizar os favoritos.");
    } finally {
      busy.current = false;
    }
  }

  function startSelection(entry: Entry) {
    if (busy.current) return;
    if (editing) {
      Alert.alert(
        "Edição em andamento",
        "Guarde ou cancele a edição antes de excluir entradas.",
      );
      return;
    }
    if (calendar) {
      openDay(dayKey(new Date(entry.createdAt)));
      closeCalendar();
    }
    showAttachments(false);
    Keyboard.dismiss();
    setSelection(new Set([entry.id]));
  }

  function confirmDeletion() {
    if (!selection?.size || busy.current) return;
    const count = selection.size;
    Alert.alert(
      count === 1 ? "Excluir esta entrada?" : `Excluir ${count} entradas?`,
      "Esta ação é permanente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            if (busy.current) return;
            const removed = deleteEntries(selection);
            const failed = new Set(
              [...selection].filter((id) => !removed.has(id)),
            );
            if (removed.size) {
              setJournal((current) => ({
                ...current,
                index: new Map(
                  [...current.index].map(([day, ids]) => [
                    day,
                    ids.filter((id) => !removed.has(id)),
                  ]),
                ),
              }));
              setThreadLinks((links) => links && new Map(links));
              if (focusSeed && removed.has(focusSeed.id)) {
                const remaining = threadEntries.find(
                  (entry) => !removed.has(entry.id),
                );
                if (remaining) setFocusSeed(remaining);
                else leaveFocus();
              }
              if (previous && removed.has(previous.id)) setPrevious(undefined);
            }
            setSelection(failed.size ? failed : undefined);
            if (failed.size)
              Alert.alert(
                "Algumas entradas não puderam ser excluídas",
                "Tente novamente.",
              );
          },
        },
      ],
    );
  }

  const emptyToday =
    writingToday && entries.length === 0 && status === "ready" && !focused;
  const renderEntry = (entry: Entry, allowSwipe = true) => (
    <EntryCard
      key={entry.id}
      entry={entry}
      allowSwipe={allowSwipe}
      previous={quotedSource(entry.continuationOf)}
      selected={selection?.has(entry.id)}
      menuActive={entryMenu?.id === entry.id}
      onOpenMenu={(props) => setEntryMenu({ id: entry.id, props })}
      onToggle={() =>
        setSelection((current) => {
          if (!current) return current;
          const next = new Set(current);
          if (!next.delete(entry.id)) next.add(entry.id);
          return next;
        })
      }
      onDelete={() => startSelection(entry)}
      onFavorite={() => void favorite(entry)}
      onReact={(emoji) => react(entry, emoji)}
      onOpenOriginal={(source) => {
        void selectionAsync();
        Keyboard.dismiss();
        setOriginal(source);
      }}
      onEdit={() => startEditing(entry)}
      onContinue={() => continueThought(entry)}
    />
  );
  const editorSaveDisabled =
    saving ||
    picking ||
    status !== "ready" ||
    (!editing?.text.trim() && !editing?.photo);
  const disabled =
    status !== "ready" || saving || picking || (!draft.trim() && !photo);

  return (
    <GlassThemeProvider value={theme}>
      <View style={styles.screen}>
        <Animated.View
          style={[styles.fill, transcript]}
          accessibilityElementsHidden={calendar || focused}
          importantForAccessibility={
            calendar || focused ? "no-hide-descendants" : "auto"
          }
          pointerEvents={focused ? "none" : "auto"}
        >
          <FlatList
            key={activeDay}
            ref={timeline}
            renderScrollComponent={(props) => (
              <ZestChatScroll
                {...props}
                offset={insets.bottom}
                extraContentPadding={readingInset}
                freeze={focused || !!editing}
                keyboardLiftBehavior="never"
              />
            )}
            data={entries}
            keyExtractor={(entry) => entry.id}
            renderItem={({ item }) => (
              <Animated.View
                entering={item.id === arriving ? entryArrival : undefined}
              >
                {renderEntry(item)}
              </Animated.View>
            )}
            maintainVisibleContentPosition={readingAnchor}
            scrollEventThrottle={32}
            onScrollBeginDrag={() => setKeepComposerOpen(false)}
            onScroll={({ nativeEvent }) => {
              const isAtTop =
                nativeEvent.contentOffset.y <=
                readingAnchor.autoscrollToTopThreshold;
              if (isAtTop && !atTop.current) setNewIdeas(0);
              atTop.current = isAtTop;
              const browsing =
                !isAtTop &&
                (history.current ||
                  nativeEvent.contentOffset.y >= historyThreshold);
              if (browsing !== history.current) {
                history.current = browsing;
                setReadingHistory(browsing);
              }
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              entries.length ? styles.list : styles.empty,
              {
                paddingTop: insets.top + headerHeight + 8,
                paddingBottom:
                  insets.bottom +
                  (selection ? 56 : showComposer ? compactHeight : 0) +
                  20,
              },
            ]}
            ListEmptyComponent={
              status === "error" ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setJournal(loadJournal())}
                >
                  <Text style={styles.body}>
                    Não foi possível abrir o diário.
                  </Text>
                  <Text style={styles.action}>Tentar novamente</Text>
                </Pressable>
              ) : !writingToday ? (
                <Animated.Text exiting={hideEmpty} style={styles.body}>
                  Nenhuma entrada neste dia.
                </Animated.Text>
              ) : undefined
            }
          />
        </Animated.View>
        <ProgressiveBlur
          singlePass
          edge="top"
          height={insets.top + headerHeight + 18}
          color={theme.paper}
        />
        <View
          pointerEvents={focused ? "none" : "box-none"}
          accessibilityElementsHidden={calendar || focused}
          onLayout={({ nativeEvent }) =>
            setHeaderHeight(Math.ceil(nativeEvent.layout.height))
          }
          style={[styles.header, { top: insets.top }]}
        >
          <View style={styles.heading}>
            <Text style={styles.wordmark}>Compasso</Text>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[styles.title, !writingToday && styles.pastTitle]}
            >
              {writingToday
                ? "Hoje"
                : parseDay(activeDay).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "short",
                  })}
            </Text>
            {(!writingToday || status === "ready") && (
              <Text style={styles.muted}>
                {!writingToday && parseDay(activeDay).getFullYear()}
                {!writingToday && status === "ready" && " · "}
                {status === "ready" &&
                  (entries.length === 1
                    ? "1 registro"
                    : `${entries.length} registros`)}
              </Text>
            )}
          </View>
          {!selection && dates[pageIndex + 1] && (
            <GlassButton
              name="chevron.left"
              label="Dia anterior disponível"
              onPress={() => openDay(dates[pageIndex + 1])}
            />
          )}
          {!selection && pageIndex > 0 && (
            <GlassButton
              name="chevron.right"
              label="Próximo dia disponível"
              onPress={() => openDay(dates[pageIndex - 1])}
            />
          )}
          {!selection && (
            <GlassButton
              name="magnifyingglass"
              label="Buscar no diário"
              onPress={() => {
                if (busy.current) return;
                showAttachments(false);
                Keyboard.dismiss();
                setSearchOpen(true);
              }}
            />
          )}
          {!selection && (
            <GlassButton
              name="calendar"
              label="Abrir calendário"
              onPress={openCalendar}
            />
          )}
        </View>
        {focusSeed && (
          <Animated.View
            entering={focusEnter}
            exiting={focusExit}
            style={styles.focusLayer}
            onAccessibilityEscape={closeFocus}
          >
            <BlurView
              pointerEvents="none"
              tint="light"
              intensity={75}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.focusWash} />
            <FlatList
              ref={threadList}
              data={threadEntries}
              keyExtractor={(entry) => entry.id}
              renderItem={({ item }) => (
                <Animated.View
                  entering={item.id === arriving ? focusArrival : undefined}
                >
                  {renderEntry(item, false)}
                </Animated.View>
              )}
              renderScrollComponent={(props) => (
                <ZestChatScroll
                  {...props}
                  offset={insets.bottom}
                  extraContentPadding={readingInset}
                  freeze={!!editing}
                  keyboardLiftBehavior="never"
                />
              )}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              onContentSizeChange={() => {
                if (!followThread.current) return;
                followThread.current = false;
                threadList.current
                  ?.getScrollResponder()
                  ?.scrollTo({ y: 0, animated: !reducedMotion });
              }}
              contentContainerStyle={[
                styles.focusMessages,
                {
                  paddingTop: insets.top + 82,
                  paddingBottom:
                    insets.bottom + (selection ? 56 : compactHeight) + 20,
                },
              ]}
            />
            <View
              onLayout={({ nativeEvent }) =>
                setFocusHeaderHeight(Math.ceil(nativeEvent.layout.height))
              }
              style={[styles.focusHeader, { top: insets.top }]}
              pointerEvents="box-none"
            >
              <View style={styles.heading}>
                <Text style={[styles.wordmark, styles.focusEyebrow]}>
                  Modo foco
                </Text>
                <Text accessibilityRole="header" style={styles.focusTitle}>
                  Continuar pensamento
                </Text>
              </View>
              <GlassButton
                name="xmark"
                label="Fechar modo foco"
                onPress={closeFocus}
              />
            </View>
          </Animated.View>
        )}
        {selection && !calendar && (
          <View
            style={[styles.selectionBar, { paddingBottom: insets.bottom + 8 }]}
          >
            <GlassSurface style={styles.selectionSurface}>
              <Pressable
                onPress={() => setSelection(undefined)}
                accessibilityLabel="Cancelar seleção"
                accessibilityRole="button"
                style={styles.control}
              >
                <Symbol name="xmark" size={19} color={theme.ink} />
              </Pressable>
              <Text style={styles.muted} accessibilityLiveRegion="polite">
                {selection.size} selecionada{selection.size === 1 ? "" : "s"}
              </Text>
              <Pressable
                onPress={confirmDeletion}
                accessibilityLabel="Excluir entradas selecionadas"
                disabled={!selection.size}
                accessibilityRole="button"
                style={styles.control}
              >
                <Symbol
                  name="trash"
                  size={20}
                  color={selection.size ? interfaceRed : theme.muted}
                />
              </Pressable>
            </GlassSurface>
          </View>
        )}
        <Animated.View
          pointerEvents={calendar || !showComposer ? "none" : "box-none"}
          accessibilityElementsHidden={calendar || !showComposer}
          importantForAccessibility={
            showComposer ? "auto" : "no-hide-descendants"
          }
          style={[styles.dock, dock, !showComposer && styles.hiddenDock]}
        >
          <KeyboardStickyView
            pointerEvents="box-none"
            offset={{ opened: insets.bottom }}
            style={[styles.composer, { paddingBottom: insets.bottom + 8 }]}
          >
            {newIdeas > 0 && !calendar && !focused && (
              <Animated.View entering={reveal} style={styles.newIdeas}>
                <GlassSurface interactive style={styles.newIdeasSurface}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityHint="Volta ao início da linha do tempo"
                    onPress={() =>
                      timeline.current
                        ?.getScrollResponder()
                        ?.scrollTo({ y: 0, animated: !reducedMotion })
                    }
                    style={styles.newIdeasButton}
                  >
                    <Symbol name="arrow.up" size={15} color={theme.ink} />
                    <Text
                      accessibilityLiveRegion="polite"
                      style={styles.action}
                    >
                      {newIdeas === 1
                        ? "1 nova ideia"
                        : `${newIdeas} novas ideias`}
                    </Text>
                  </Pressable>
                </GlassSurface>
              </Animated.View>
            )}
            <GlassSurface interactive style={[styles.composerSurface, surface]}>
              <Animated.View
                style={[styles.composerClip, expandedContents]}
                pointerEvents={compact ? "none" : "auto"}
                accessibilityElementsHidden={compact}
                importantForAccessibility={
                  compact ? "no-hide-descendants" : "auto"
                }
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
                          Math.max(
                            inputMinimum,
                            Math.ceil(nativeEvent.layout.height),
                          ),
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
                          <Symbol
                            name="xmark"
                            size={12}
                            color={theme.onHeavy}
                          />
                        </View>
                      </Pressable>
                    </Animated.View>
                  )}
                  <View style={styles.actions}>
                    <Touch
                      expanded={attachmentsOpen}
                      label={
                        attachmentsOpen ? "Voltar ao teclado" : "Abrir anexos"
                      }
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
                  <Symbol
                    name="square.and.pencil"
                    size={17}
                    color={theme.ink}
                  />
                  <Text numberOfLines={1} style={styles.action}>
                    {draft || photo || previous
                      ? "Continuar rascunho"
                      : "Escreva para você…"}
                  </Text>
                </Pressable>
              )}
            </GlassSurface>
            <Animated.View
              style={[styles.panelClip, attachmentPanel]}
              pointerEvents={attachmentsOpen ? "auto" : "none"}
              accessibilityElementsHidden={!attachmentsOpen}
              importantForAccessibility={
                attachmentsOpen ? "auto" : "no-hide-descendants"
              }
            >
              <View style={styles.attachmentPanel}>
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <GlassSurface materialize={0} style={styles.trayGlass} />
                </View>
                <GestureDetector gesture={pullTray}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar anexos"
                    onPress={closeAttachments}
                    style={styles.panelGrabber}
                  >
                    <View style={styles.panelHandle} />
                  </Pressable>
                </GestureDetector>
                <ScrollView
                  style={styles.fill}
                  contentContainerStyle={styles.attachmentActions}
                  showsVerticalScrollIndicator={false}
                >
                  <Touch
                    label="Escolher foto"
                    onPress={() => void attachPhoto(false)}
                    style={styles.attachmentAction}
                    disabled={saving || picking}
                  >
                    <Symbol
                      name="photo.on.rectangle"
                      size={24}
                      color={theme.ink}
                    />
                    <Text style={styles.trayLabel}>Fotos</Text>
                  </Touch>
                  <Touch
                    label="Tirar foto"
                    onPress={() => void attachPhoto(true)}
                    style={styles.attachmentAction}
                    disabled={saving || picking}
                  >
                    <Symbol name="camera" size={24} color={theme.ink} />
                    <Text style={styles.trayLabel}>Câmera</Text>
                  </Touch>
                  {textRecognition && (
                    <Touch
                      label="Capturar texto pela câmera"
                      onPress={() => void attachPhoto(true, "text")}
                      style={styles.attachmentAction}
                      disabled={saving || picking}
                    >
                      <Symbol
                        name="text.viewfinder"
                        size={24}
                        color={theme.ink}
                      />
                      <Text style={styles.trayLabel}>Ler texto</Text>
                    </Touch>
                  )}
                </ScrollView>
              </View>
            </Animated.View>
          </KeyboardStickyView>
        </Animated.View>
        {calendar && (
          <DiaryCalendar
            index={index}
            initialDay={activeDay}
            today={today}
            progress={calendarProgress}
            renderEntry={renderEntry}
            onClose={closeCalendar}
            onOpenDay={(day) => {
              openDay(day);
              closeCalendar();
            }}
          />
        )}
        {searchOpen && (
          <DiarySearch index={index} onClose={() => setSearchOpen(false)} />
        )}
        {editing && (
          <Modal
            presentationStyle="pageSheet"
            animationType={reducedMotion ? "none" : "slide"}
            onShow={() => editorInput.current?.focus()}
            onRequestClose={closeEditor}
          >
            <GestureHandlerRootView style={styles.fill}>
              <SafeAreaProvider style={styles.editorSurface}>
                <KeyboardAvoidingView
                  automaticOffset
                  behavior="padding"
                  enabled={Platform.OS === "ios"}
                  onAccessibilityEscape={closeEditor}
                  style={styles.fill}
                >
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
                      <ScrollView
                        alwaysBounceVertical={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                          styles.editorContent,
                          { paddingTop: editorHeaderHeight + 8 },
                        ]}
                      >
                        <View style={styles.editorCard}>
                          <TextInput
                            ref={editorInput}
                            accessibilityLabel="Texto da entrada"
                            placeholder="Escreva para você…"
                            placeholderTextColor={theme.muted}
                            selectionColor={interfaceRed}
                            multiline
                            editable={!saving && !picking}
                            value={editing.text}
                            onChangeText={(text) =>
                              setEditing(
                                (current) => current && { ...current, text },
                              )
                            }
                            style={[styles.body, styles.editorInput]}
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
                              setEditing(
                                (current) => current && { ...current, tags },
                              )
                            }
                            editable={!saving && !picking}
                            autoCapitalize="none"
                            style={styles.editorTags}
                          />
                        </View>
                      </ScrollView>
                      <View
                        pointerEvents="box-none"
                        onLayout={({ nativeEvent }) =>
                          setEditorHeaderHeight(
                            Math.ceil(nativeEvent.layout.height),
                          )
                        }
                        style={styles.editorHeader}
                      >
                        <ProgressiveBlur
                          singlePass
                          edge="top"
                          height={editorHeaderHeight + 14}
                          color={theme.paper}
                        />
                        <GlassButton
                          name="xmark"
                          label="Cancelar edição"
                          onPress={closeEditor}
                          disabled={saving || picking}
                        />
                        <View style={styles.editorHeading}>
                          <Text
                            accessibilityRole="header"
                            style={styles.editorTitle}
                          >
                            Editar entrada
                          </Text>
                          <Text style={styles.editorDate}>
                            {new Date(
                              editing.entry.createdAt,
                            ).toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            · {timeLabel(editing.entry.createdAt)}
                          </Text>
                        </View>
                        <GlassButton
                          name="checkmark"
                          label={
                            saving ? "Salvando alterações" : "Salvar alterações"
                          }
                          onPress={saveEdit}
                          disabled={editorSaveDisabled}
                          prominent
                        />
                      </View>
                      <View
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
                              label={
                                editing.photo ? "Trocar foto" : "Escolher foto"
                              }
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
                              <Symbol
                                name="camera"
                                size={20}
                                color={theme.ink}
                              />
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
                                <Symbol
                                  name="trash"
                                  size={18}
                                  color={interfaceRed}
                                />
                              </Touch>
                            )}
                          </GlassSurface>
                        </Animated.View>
                      </View>
                    </View>
                  </SafeAreaView>
                </KeyboardAvoidingView>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </Modal>
        )}
        {original && (
          <Modal
            transparent
            animationType={reducedMotion ? "none" : "fade"}
            onRequestClose={closeOriginal}
          >
            <View
              accessibilityViewIsModal
              onAccessibilityEscape={closeOriginal}
              style={[
                styles.originalLayer,
                { paddingBottom: insets.bottom + 16 },
              ]}
            >
              <Pressable
                accessible={false}
                onPress={closeOriginal}
                style={StyleSheet.absoluteFill}
              />
              <GlassSurface style={styles.originalSheet}>
                <View style={styles.originalHeader}>
                  <View style={styles.heading}>
                    <Text accessibilityRole="header" style={styles.focusTitle}>
                      Entrada original
                    </Text>
                    <Text style={styles.muted}>
                      {dateLabel(dayKey(new Date(original.createdAt)))} ·{" "}
                      {timeLabel(original.createdAt)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Voltar à leitura"
                    onPress={closeOriginal}
                    style={styles.originalClose}
                  >
                    <Symbol name="xmark" size={17} color={theme.ink} />
                  </Pressable>
                </View>
                <ScrollView
                  style={styles.originalContent}
                  contentContainerStyle={styles.originalBody}
                >
                  <DiaryEntryBody
                    entry={original}
                    previous={quotedSource(original.continuationOf)}
                    selectable
                    showFavorite
                  />
                </ScrollView>
              </GlassSurface>
            </View>
          </Modal>
        )}
        {entryMenu && (
          <EntryActions
            {...entryMenu.props}
            protectedTop={
              insets.top + (focused ? focusHeaderHeight : headerHeight)
            }
            onClose={closeEntryMenu}
          />
        )}
      </View>
    </GlassThemeProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  fill: { flex: 1 },
  focusLayer: { ...StyleSheet.absoluteFill, backgroundColor: "transparent" },
  focusWash: { ...StyleSheet.absoluteFill, backgroundColor: "#F7F2E8B0" },
  focusHeader: {
    position: "absolute",
    left: 20,
    right: 20,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  focusTitle: {
    color: "#111111",
    fontSize: 21,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  focusEyebrow: { color: interfaceRed },
  focusMessages: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  heading: { flex: 1 },
  wordmark: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },
  title: {
    color: theme.ink,
    fontSize: 32,
    fontWeight: "600",
    letterSpacing: -1,
  },
  pastTitle: { fontSize: 24 },
  list: { paddingHorizontal: 20 },
  empty: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  entryRow: {
    position: "relative",
    marginBottom: 12,
    paddingRight: 8,
    paddingLeft: 24,
  },
  entryMetadata: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 5,
  },
  entryTime: {
    color: theme.muted,
    fontSize: 12,
    marginBottom: 4,
    paddingRight: 4,
    textAlign: "right",
  },
  swipeHint: { position: "absolute", right: 12, top: 24, padding: 6 },
  entry: {
    alignSelf: "flex-end",
    maxWidth: "100%",
    paddingLeft: 12,
    paddingRight: 18,
    paddingVertical: 8,
    borderRadius: 17,
    borderCurve: "continuous",
    gap: 6,
  },
  hiddenBubble: { opacity: 0 },
  mediaEntry: { width: "100%", maxWidth: 320 },
  editorSurface: { flex: 1, backgroundColor: theme.paper },
  editor: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  editorReadingArea: { flex: 1 },
  editorHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
  },
  editorHeading: { flex: 1, alignItems: "center", gap: 3 },
  editorTitle: {
    color: theme.ink,
    fontSize: 19,
    fontWeight: "600",
    textAlign: "center",
  },
  editorDate: { color: theme.muted, fontSize: 13, textAlign: "center" },
  editorButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  editorContent: { paddingBottom: 60 },
  editorCard: {
    gap: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D9C6BD",
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: "#FFFCF8",
  },
  editorTags: {
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D9C6BD",
    color: theme.ink,
    fontSize: 14,
    paddingHorizontal: 2,
  },
  editorInput: { height: 148, textAlignVertical: "top", padding: 2 },
  editorToolbarOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  editorToolbarGlass: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 24,
  },
  originalLayer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    backgroundColor: "#211D1B33",
  },
  originalSheet: { maxHeight: "78%", borderRadius: 32, padding: 18, gap: 14 },
  originalHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  originalClose: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  originalContent: { flexGrow: 0, flexShrink: 1 },
  originalBody: { gap: 12 },
  quotedEntry: { flexDirection: "row", alignItems: "center", gap: 8 },
  quoteThumbnail: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: theme.paper,
  },
  muted: { color: theme.muted, fontSize: 13 },
  body: { color: theme.ink, fontSize: 17, lineHeight: 24 },
  quote: {
    backgroundColor: "#FFF5F1",
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  photo: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 12,
    backgroundColor: theme.paper,
  },
  entryTags: { color: "#79342D", fontSize: 13 },
  reaction: {
    alignSelf: "flex-end",
    backgroundColor: "#FFF5F1",
    paddingHorizontal: 6,
    borderRadius: 12,
    fontSize: 16,
  },
  selectableRow: { paddingLeft: 44 },
  selectionIndicator: {
    position: "absolute",
    left: -40,
    top: 5,
    width: 32,
    alignItems: "center",
  },
  selectionBar: { position: "absolute", left: 16, right: 16, bottom: 0 },
  selectionSurface: {
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  hiddenDock: { opacity: 0 },
  composer: { paddingHorizontal: 16 },
  newIdeas: { alignSelf: "center", marginBottom: 4 },
  newIdeasSurface: { borderRadius: 22 },
  newIdeasButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  composerSurface: { borderRadius: 28, alignSelf: "center" },
  composerClip: { flex: 1, borderRadius: 28, overflow: "hidden" },
  composerContents: {
    position: "absolute",
    bottom: 0,
    left: 0,
    padding: 8,
    gap: 6,
  },
  compactComposer: {
    position: "absolute",
    inset: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 16,
  },
  panelGrabber: {
    alignSelf: "center",
    width: 80,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  trayLabel: { color: theme.ink, fontSize: 14, fontWeight: "600" },
  panelClip: { overflow: "hidden", borderRadius: 28 },
  attachmentPanel: {
    flex: 1,
    marginTop: 8,
    borderRadius: 28,
    padding: 12,
  },
  trayGlass: { flex: 1, borderRadius: 28 },
  plus: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  panelHandle: {
    alignSelf: "center",
    width: 30,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#A8A99F",
  },
  attachmentActions: {
    flexGrow: 1,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    alignItems: "center",
  },
  attachmentAction: {
    width: 86,
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: "#F2DAD34D",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  input: {
    paddingHorizontal: 5,
    paddingVertical: 9,
    color: theme.ink,
    fontSize: 17,
    lineHeight: 22,
  },
  inputMeasure: { position: "absolute", top: 0, left: 0, right: 0, opacity: 0 },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingLeft: 12,
    gap: 8,
    backgroundColor: "#F4D7D1",
    borderRadius: 20,
    borderCurve: "continuous",
  },
  replyCopy: { flex: 1, gap: 2 },
  replyLabel: { color: "#79342D", fontSize: 12, fontWeight: "600" },
  replyExcerpt: { color: theme.ink, fontSize: 14 },
  dismiss: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  attachment: { alignSelf: "flex-start", marginLeft: 4 },
  thumbnail: { width: 88, height: 88, borderRadius: 12 },
  photoDismiss: { position: "absolute", top: 0, right: 0 },
  pressedControl: { opacity: 0.65, transform: [{ scale: 0.94 }] },
  photoDismissIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#252720D9",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  control: { minHeight: 44, justifyContent: "center", paddingHorizontal: 6 },
  action: { color: theme.ink, fontSize: 14, fontWeight: "600" },
  disabled: { backgroundColor: theme.muted },
});
