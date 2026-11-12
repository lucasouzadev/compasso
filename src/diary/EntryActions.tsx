import { entryMenuLayout, type MenuProtectedBand } from "./menuLayout";
import {
  BottomSheet,
  Button,
  Group,
  Host,
  HStack,
  Image as SwiftImage,
  ScrollView,
  Spacer,
  Divider as ViewDivider,
  Text,
  TextField,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  background,
  buttonStyle,
  cornerRadius,
  contentShape,
  foregroundStyle,
  shapes,
  font,
  frame,
  padding,
  presentationDetents,
  presentationDragIndicator,
  scrollEdgeEffectStyle,
} from "@expo/ui/swift-ui/modifiers";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Pressable,
  ScrollView as NativeScroll,
  StyleSheet,
  Text as NativeText,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Symbol } from "../cookbooks/zest/components/ui/Touch";
import { GlassSurface } from "../cookbooks/zest/components/ui/GlassSurface";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedReaction,
  useDerivedValue,
  type SharedValue,
  useSharedValue,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";
import { selectionAsync } from "expo-haptics";
import { scheduleOnRN } from "react-native-worklets";
import { replaceQuickReaction } from "./reactions";

const catalog = [
  [
    "Rostos e pessoas",
    "😀|sorriso 😃|feliz 😄|alegria 😁|riso 😆|risada 😅|suor 😂|risada lágrimas 🤣|gargalhada 🙂|sorriso 🙃|invertido 😉|piscada 😊|feliz 😇|anjo 🥰|carinho 😍|apaixonado 🤩|estrelas 😘|beijo 😋|delícia 😛|língua 🤔|pensando 🤫|silêncio 🤐|segredo 😐|neutro 😒|tédio 🙄|olhos 😌|alívio 😴|sono 🤤|baba 😷|máscara 🤒|febre 🤢|enjoo 🤯|surpresa 😎|óculos 🥳|festa 😮|surpresa 😳|vergonha 🥺|súplica 😢|triste 😭|choro 😱|medo 😤|bufando 😠|raiva 😡|bravo 🤡|palhaço 👻|fantasma 👍|positivo 👎|negativo 👏|palmas 🙌|celebração 🙏|gratidão oração 🤝|acordo 💪|força 👋|oi ✌️|paz 🫶|amor",
  ],
  [
    "Animais e natureza",
    "🐶|cachorro 🐱|gato 🐭|rato 🐹|hamster 🐰|coelho 🦊|raposa 🐻|urso 🐼|panda 🐨|coala 🐯|tigre 🦁|leão 🐮|vaca 🐷|porco 🐸|sapo 🐵|macaco 🐔|galinha 🐧|pinguim 🦜|papagaio 🦋|borboleta 🐝|abelha 🐢|tartaruga 🐬|golfinho 🌵|cacto 🌿|folha 🌻|girassol 🌷|tulipa 🌹|rosa 🌞|sol 🌙|lua ⭐|estrela 🌈|arco-íris ☔|chuva ❄️|neve 🔥|fogo",
  ],
  [
    "Comida",
    "🍎|maçã 🍓|morango 🍌|banana 🍇|uva 🍉|melancia 🍒|cereja 🥑|abacate 🍅|tomate 🥕|cenoura 🍞|pão 🧀|queijo 🍕|pizza 🍔|hambúrguer 🍟|batata 🍣|sushi 🍝|macarrão 🍦|sorvete 🍰|bolo 🍫|chocolate 🍿|pipoca ☕|café 🍵|chá 🍺|cerveja 🍷|vinho 🧃|suco",
  ],
  [
    "Atividades e viagem",
    "⚽|futebol 🏀|basquete 🎾|tênis 🏐|vôlei 🏆|troféu 🏅|medalha 🎯|alvo 🎮|jogo 🎸|guitarra 🎤|microfone 🎨|arte 🎬|cinema 🎉|festa 🚗|carro 🚲|bicicleta 🚌|ônibus 🚆|trem ✈️|avião 🚀|foguete 🏖️|praia 🏕️|acampamento 🏠|casa 🗺️|mapa",
  ],
  [
    "Objetos e símbolos",
    "💡|ideia 📚|livros 📸|câmera 📱|celular 💻|computador 🎧|fone ⏰|relógio 🎁|presente 🔑|chave 💸|dinheiro 📝|nota 💬|conversa 📌|marcador ❤️|coração amor 🧡|coração laranja 💛|coração amarelo 💚|coração verde 💙|coração azul 💜|coração roxo 🤍|coração branco 🖤|coração preto 💔|coração partido 💕|corações ✨|brilho 💯|cem ✅|confirmado ❌|erro ❓|pergunta ⚠️|aviso ♻️|reciclagem",
  ],
  [
    "Bandeiras",
    "🇧🇷|brasil 🇵🇹|portugal 🇦🇷|argentina 🇺🇾|uruguai 🇨🇱|chile 🇲🇽|méxico 🇺🇸|estados unidos 🇨🇦|canadá 🇫🇷|frança 🇮🇹|itália 🇪🇸|espanha 🇩🇪|alemanha 🇬🇧|reino unido 🇯🇵|japão 🇰🇷|coreia 🏳️‍🌈|orgulho",
  ],
].map(([title, data]) => ({
  title,
  emojis: data.split(/ (?=\S+\|)/).map((item) => {
    const [emoji, name] = item.split("|");
    return { emoji, name };
  }),
}));
const normalize = (text: string) =>
  text
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
const searchable = catalog.flatMap(({ emojis }) => emojis);
let recent: string[] = [];

function EmojiButton({
  emoji,
  selected,
  width = 40,
  label = emoji,
  onPress,
}: {
  emoji: string;
  selected?: boolean;
  width?: number;
  label?: string;
  onPress: () => void;
}) {
  return (
    <Button
      onPress={onPress}
      modifiers={[buttonStyle("plain"), accessibilityLabel(label)]}
    >
      <Text
        modifiers={[
          font({ size: 23 }),
          frame({ width, height: 40 }),
          background(selected ? "#F4D7D1" : "#00000000"),
          cornerRadius(20),
        ]}
      >
        {emoji}
      </Text>
    </Button>
  );
}

export type BubbleBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ContextPointer = {
  x: number;
  y: number;
  phase: "idle" | "moving" | "released";
};

const cell = 44;
const row = 44;
const reactionHeight = 50;

export type DiaryMenuAction = {
  title: string;
  icon:
    | "arrowshape.turn.up.left.fill"
    | "pencil"
    | "trash"
    | "bookmark"
    | "bookmark.fill"
    | "doc.on.doc"
    | "square.and.arrow.up";
  destructive?: boolean;
  onPress: () => void;
};

export function EntryActions({
  bounds,
  protectedTop = 0,
  protectedBand,
  pointer,
  onClose,
  children,
  reaction,
  quickReactions,
  onSaveQuickReactions,
  onReact,
  actions,
}: {
  bounds: BubbleBounds;
  protectedTop?: number;
  protectedBand?: MenuProtectedBand;
  pointer: SharedValue<ContextPointer>;
  onClose: () => void;
  children: ReactNode;
  reaction?: string;
  quickReactions: string[];
  onSaveQuickReactions: (reactions: string[]) => boolean;
  onReact: (emoji: string) => void;
  actions: DiaryMenuAction[];
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const source = bounds;
  const [glassVisible, setGlassVisible] = useState(true);
  const reducedMotion = useReducedMotion();
  const [sheetOpen, setSheetOpen] = useState(false);
  const pickedEmoji = useRef<string | undefined>(undefined);
  const closing = useRef(false);
  const pendingAction = useRef<(() => void) | undefined>(undefined);
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.set(
      withTiming(1, { duration: 220, reduceMotion: ReduceMotion.System }),
    );
  }, [phase]);

  const actionCount = actions.length;
  const { top, previewHeight, actionsHeight, contentHeight, railTop, menuTop } =
    entryMenuLayout({
      screenHeight: height,
      safeTop: Math.max(insets.top, protectedTop),
      safeBottom: insets.bottom,
      sourceTop: source.y,
      sourceHeight: source.height,
      actionCount,
      protectedBand,
    });
  const menuOffset = useSharedValue(0);
  const menuScroll = useAnimatedScrollHandler(({ contentOffset }) => {
    menuOffset.set(contentOffset.y);
  });
  const right = Math.min(width - 10, source.x + source.width);
  const railPadding = 7;
  const plusIndex = quickReactions.length;
  const railWidth = Math.min(
    width - 24,
    cell * (plusIndex + 1) + 2 * railPadding,
  );
  const cellWidth = (railWidth - 2 * railPadding) / (plusIndex + 1);
  const menuWidth = Math.min(width - 24, 258);
  const railLeft = Math.max(12, right - railWidth);
  const menuLeft = Math.max(12, right - menuWidth);
  const firstAction = 4;
  const target = useDerivedValue(() => {
    const point = pointer.get();
    if (point.phase === "idle") return -1;
    const rx = point.x - railLeft - railPadding;
    const ry = point.y - railTop;
    if (
      rx >= 0 &&
      rx < cellWidth * (plusIndex + 1) &&
      ry >= 0 &&
      ry < reactionHeight
    ) {
      return Math.floor(rx / cellWidth);
    }
    const mx = point.x - menuLeft;
    const my = point.y - menuTop - firstAction + menuOffset.get();
    if (
      mx >= 0 &&
      mx < menuWidth &&
      point.y >= menuTop &&
      point.y < menuTop + actionsHeight &&
      my >= 0 &&
      my < actionCount * row
    ) {
      return plusIndex + 1 + Math.floor(my / row);
    }
    return -1;
  });
  const railHighlight = useAnimatedStyle(() => {
    const index = target.get();
    return {
      opacity: index >= 0 && index < plusIndex ? 1 : 0,
      transform: [{ translateX: Math.max(0, index) * cellWidth }],
    };
  });
  const plusHighlight = useAnimatedStyle(() => ({
    opacity: target.get() === plusIndex ? 1 : 0,
  }));
  const menuHighlight = useAnimatedStyle(() => {
    const index = target.get() - plusIndex - 1;
    return {
      opacity: index >= 0 ? 1 : 0,
      transform: [{ translateY: Math.max(0, index) * row }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: phase.get() }));
  const actionsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * (1 - phase.get()) }],
  }));
  const railStyle = useAnimatedStyle(() => ({
    opacity: phase.get(),
    transform: [
      { translateY: 6 * (1 - phase.get()) },
      { scale: 0.94 + 0.06 * phase.get() },
    ],
  }));
  const previewStyle = useAnimatedStyle(() => ({
    opacity: protectedBand ? phase.get() : 1,
    transform: [
      { translateY: protectedBand ? 0 : (source.y - top) * (1 - phase.get()) },
    ],
  }));

  const finish = useCallback(() => {
    const action = pendingAction.current;
    pendingAction.current = undefined;
    onClose();
    action?.();
  }, [onClose]);

  function close(action?: () => void) {
    if (closing.current) return;
    closing.current = true;
    pendingAction.current = action;
    setGlassVisible(false);
  }

  useEffect(() => {
    if (glassVisible) return;
    phase.set(
      withTiming(
        0,
        { duration: 180, reduceMotion: ReduceMotion.System },
        (finished) => {
          if (finished) scheduleOnRN(finish);
        },
      ),
    );
  }, [glassVisible, phase, finish]);

  function reactTo(emoji: string) {
    recent = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, 18);
    close(() => onReact(emoji));
  }

  function commit(index: number) {
    if (index < plusIndex) reactTo(quickReactions[index]);
    else if (index === plusIndex) {
      pointer.set({ x: 0, y: 0, phase: "idle" });
      setSheetOpen(true);
    } else close(actions[index - plusIndex - 1]?.onPress);
  }
  function selectionHaptic() {
    void selectionAsync().catch(() => {});
  }
  useAnimatedReaction(
    () => ({ index: target.get(), phase: pointer.get().phase }),
    (current, previous) => {
      if (current.index < 0) return;
      if (current.phase === "moving" && current.index !== previous?.index) {
        scheduleOnRN(selectionHaptic);
      }
      if (current.phase === "released" && previous?.phase !== "released") {
        scheduleOnRN(commit, current.index);
      }
    },
  );

  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityViewIsModal
      onAccessibilityEscape={() => close()}
    >
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <Pressable
          accessibilityLabel="Fechar ações da entrada"
          onPress={() => close()}
          style={styles.scrim}
        />
      </Animated.View>
      <View
        pointerEvents={glassVisible ? "box-none" : "none"}
        style={StyleSheet.absoluteFill}
      >
        <View
          style={[
            styles.rail,
            {
              top: railTop,
              left: railLeft,
              width: railWidth,
            },
          ]}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <GlassSurface
              visible={glassVisible}
              materialize={reducedMotion ? 0 : 0.16}
              style={styles.railGlass}
            />
          </View>
          <Animated.View
            style={[
              styles.railContent,
              { paddingHorizontal: railPadding },
              railStyle,
            ]}
          >
            <View style={styles.emojiStrip}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.railHighlight,
                  { width: cellWidth },
                  railHighlight,
                ]}
              />
              {quickReactions.map((emoji) => (
                <Pressable
                  key={emoji}
                  accessibilityRole="button"
                  accessibilityLabel={emoji}
                  accessibilityState={{ selected: emoji === reaction }}
                  onPress={() => reactTo(emoji)}
                  style={[
                    styles.railCell,
                    { width: cellWidth },
                    emoji === reaction && styles.currentEmoji,
                  ]}
                >
                  <NativeText style={styles.railEmoji}>{emoji}</NativeText>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.railCell, { width: cellWidth }]}
              accessibilityRole="button"
              accessibilityLabel="Mais emojis"
              onPress={() => setSheetOpen(true)}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.railHighlight,
                  { width: cellWidth },
                  plusHighlight,
                ]}
              />
              <Symbol name="plus" size={20} color="#211D1B" />
            </Pressable>
          </Animated.View>
        </View>
        <Animated.View
          style={[
            styles.preview,
            previewStyle,
            {
              top,
              left: Math.max(10, right - source.width),
              width: source.width,
              height: previewHeight,
            },
          ]}
        >
          {source.height > previewHeight ? (
            <NativeScroll nestedScrollEnabled>{children}</NativeScroll>
          ) : (
            children
          )}
        </Animated.View>
        <Animated.View
          style={[
            actionsStyle,
            styles.actions,
            {
              height: actionsHeight,
              top: menuTop,
              left: menuLeft,
              width: menuWidth,
            },
          ]}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <GlassSurface
              visible={glassVisible}
              materialize={reducedMotion ? 0 : 0.16}
              style={styles.actionsGlass}
            />
          </View>
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <Animated.ScrollView
              onScroll={menuScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ height: contentHeight }}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.menuHighlight,
                  { top: firstAction },
                  menuHighlight,
                ]}
              />
              <Host
                colorScheme="light"
                style={[styles.actionRows, { height: contentHeight }]}
              >
                <VStack spacing={0}>
                  {actions.map((action) => (
                    <MenuAction
                      key={action.icon}
                      {...action}
                      onPress={() => close(action.onPress)}
                    />
                  ))}
                </VStack>
              </Host>
            </Animated.ScrollView>
          </Animated.View>
        </Animated.View>
        <EmojiSheet
          visible={sheetOpen}
          reaction={reaction}
          quickReactions={quickReactions}
          onSaveQuickReactions={onSaveQuickReactions}
          onClose={() => setSheetOpen(false)}
          onReact={(emoji) => {
            pickedEmoji.current = emoji;
            setSheetOpen(false);
          }}
          onDismiss={() => {
            const emoji = pickedEmoji.current;
            pickedEmoji.current = undefined;
            if (emoji) reactTo(emoji);
          }}
        />
      </View>
    </View>
  );
}

function MenuAction({ title, icon, destructive, onPress }: DiaryMenuAction) {
  return (
    <Button
      role={destructive ? "destructive" : undefined}
      onPress={onPress}
      modifiers={[buttonStyle("plain"), accessibilityLabel(title)]}
    >
      <VStack spacing={0}>
        {destructive && <ViewDivider />}
        <HStack
          spacing={12}
          modifiers={[
            padding({ horizontal: 16 }),
            frame({ height: destructive ? row - 1 : row }),
            frame({ maxWidth: Infinity, alignment: "leading" }),
            contentShape(shapes.rectangle()),
            foregroundStyle(destructive ? "#B82018" : "#211D1B"),
          ]}
        >
          <SwiftImage
            systemName={icon}
            size={19}
            modifiers={[frame({ width: 22 })]}
          />
          <Text modifiers={[font({ size: 17 })]}>{title}</Text>
          <Spacer />
        </HStack>
      </VStack>
    </Button>
  );
}

function EmojiSheet({
  visible,
  reaction,
  quickReactions,
  onSaveQuickReactions,
  onClose,
  onReact,
  onDismiss,
}: {
  visible: boolean;
  reaction?: string;
  quickReactions: string[];
  onSaveQuickReactions: (reactions: string[]) => boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onDismiss: () => void;
}) {
  const { width } = useWindowDimensions();
  const columns = 7;
  const emojiWidth = Math.max(32, Math.min(52, (width - 52) / columns));
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>();
  const [slot, setSlot] = useState(0);
  const [saveError, setSaveError] = useState(false);
  function leaveCustomization() {
    setDraft(undefined);
    setSaveError(false);
  }
  function chooseEmoji(emoji: string) {
    if (!draft) {
      onReact(emoji);
      return;
    }
    setDraft(replaceQuickReaction(draft, slot, emoji));
    setSaveError(false);
  }
  const term = normalize(query);
  const groups = term
    ? [
        {
          title: "Resultados",
          emojis: searchable
            .filter(
              ({ name, emoji }) =>
                normalize(name).includes(term) || emoji.includes(query.trim()),
            )
            .map(({ emoji }) => emoji),
        },
      ]
    : [
        ...(!draft
          ? [{ title: "Reações rápidas", emojis: quickReactions }]
          : []),
        ...(recent.length ? [{ title: "Recentes", emojis: recent }] : []),
        ...catalog.map(({ title, emojis }) => ({
          title,
          emojis: emojis.map(({ emoji }) => emoji),
        })),
      ];
  return (
    <View style={styles.anchor} pointerEvents="none">
      <Host style={styles.fill} colorScheme="light">
        <BottomSheet
          isPresented={visible}
          onDismiss={() => {
            setQuery("");
            leaveCustomization();
            onDismiss();
          }}
          onIsPresentedChange={(open) => {
            if (!open) onClose();
          }}
        >
          <Group
            modifiers={[
              presentationDetents(draft ? ["large"] : ["medium", "large"]),
              presentationDragIndicator("visible"),
            ]}
          >
            <VStack
              alignment="leading"
              spacing={10}
              modifiers={[padding({ top: 20, leading: 16, trailing: 16 })]}
            >
              {draft ? (
                <VStack alignment="leading" spacing={8}>
                  <HStack>
                    <Button
                      label="Cancelar"
                      onPress={leaveCustomization}
                      modifiers={[buttonStyle("borderless")]}
                    />
                    <Spacer />
                    <Text modifiers={[font({ size: 16, weight: "semibold" })]}>
                      Reações rápidas
                    </Text>
                    <Spacer />
                    <Button
                      label="Guardar"
                      onPress={() => {
                        if (onSaveQuickReactions(draft)) leaveCustomization();
                        else setSaveError(true);
                      }}
                      modifiers={[buttonStyle("borderless")]}
                    />
                  </HStack>
                  <HStack spacing={3}>
                    {draft.map((emoji, index) => (
                      <EmojiButton
                        key={index}
                        emoji={emoji}
                        width={emojiWidth}
                        label={`Posição ${index + 1}: ${emoji}${slot === index ? ", selecionada" : ""}`}
                        selected={slot === index}
                        onPress={() => setSlot(index)}
                      />
                    ))}
                  </HStack>
                  <Text modifiers={[font({ size: 13 })]}>
                    {saveError
                      ? "Não foi possível guardar. Tente novamente."
                      : "Escolha um emoji para substituir a posição selecionada."}
                  </Text>
                </VStack>
              ) : (
                <Button
                  label="Personalizar reações rápidas"
                  systemImage="slider.horizontal.3"
                  onPress={() => {
                    setSlot(0);
                    setDraft(quickReactions);
                  }}
                  modifiers={[buttonStyle("borderless")]}
                />
              )}
              <HStack
                spacing={9}
                modifiers={[
                  padding({ all: 10 }),
                  background("#F1EDE6"),
                  cornerRadius(18),
                ]}
              >
                <SwiftImage systemName="magnifyingglass" size={16} />
                <TextField
                  placeholder="Pesquisar emoji"
                  onTextChange={setQuery}
                  modifiers={[
                    frame({ maxWidth: Infinity, alignment: "leading" }),
                  ]}
                />
              </HStack>
              <ScrollView
                showsIndicators={false}
                modifiers={[
                  frame({ maxWidth: Infinity, alignment: "leading" }),
                  scrollEdgeEffectStyle("soft", "vertical"),
                ]}
              >
                <VStack
                  alignment="leading"
                  spacing={8}
                  modifiers={[
                    frame({ maxWidth: Infinity, alignment: "leading" }),
                  ]}
                >
                  {groups.map(({ title, emojis }) => (
                    <VStack key={title} alignment="leading" spacing={5}>
                      <Text
                        modifiers={[
                          font({ size: 13, weight: "semibold" }),
                          padding({ top: 6 }),
                        ]}
                      >
                        {title}
                      </Text>
                      {!emojis.length && <Text>Nenhum emoji encontrado.</Text>}
                      {Array.from(
                        { length: Math.ceil(emojis.length / columns) },
                        (_, row) => (
                          <HStack key={row} spacing={1}>
                            {emojis
                              .slice(row * columns, (row + 1) * columns)
                              .map((emoji) => (
                                <EmojiButton
                                  key={emoji}
                                  emoji={emoji}
                                  width={emojiWidth}
                                  selected={
                                    (draft ? draft[slot] : reaction) === emoji
                                  }
                                  onPress={() => chooseEmoji(emoji)}
                                />
                              ))}
                          </HStack>
                        ),
                      )}
                    </VStack>
                  ))}
                </VStack>
              </ScrollView>
            </VStack>
          </Group>
        </BottomSheet>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(30, 23, 20, 0.16)",
  },
  rail: {
    position: "absolute",
    height: reactionHeight,
  },
  preview: { position: "absolute" },
  actions: {
    position: "absolute",
  },
  railGlass: { flex: 1, borderRadius: 25 },
  actionRows: { justifyContent: "center" },
  actionsGlass: { flex: 1, borderRadius: 20 },
  railContent: { flex: 1, flexDirection: "row", alignItems: "center" },
  emojiStrip: { flexDirection: "row" },
  railCell: {
    width: cell,
    height: cell,
    alignItems: "center",
    justifyContent: "center",
  },
  railEmoji: { fontSize: 25 },
  currentEmoji: { borderRadius: 20, backgroundColor: "#F4D7D1" },
  railHighlight: {
    position: "absolute",
    top: 0,
    width: cell,
    height: cell,
    borderRadius: 20,
    backgroundColor: "#D6281E33",
  },
  menuHighlight: {
    position: "absolute",
    left: 5,
    right: 5,
    height: row,
    borderRadius: 14,
    backgroundColor: "#3A302A17",
  },
  anchor: { position: "absolute", left: 0, bottom: 0, width: 44, height: 44 },
});
