import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useGlassTheme } from "../cookbooks/zest/components/ui/GlassSurface";
import { Symbol } from "../cookbooks/zest/components/ui/Touch";
import { quotedEntryText, type Entry } from "./entries";
import { entryPhotoUri, quotedPhotoUri } from "./storage";

export function DiaryEntryBody({
  entry,
  previous,
  onOpenOriginal,
  selectable = false,
  showFavorite = false,
}: {
  entry: Entry;
  previous?: Entry;
  onOpenOriginal?: (entry: Entry) => void;
  selectable?: boolean;
  showFavorite?: boolean;
}) {
  const theme = useGlassTheme();
  const photo = entryPhotoUri(entry);
  const quote = quotedEntryText(entry, previous);
  const quoteUri = quotedPhotoUri(entry, previous);
  const missing = !!entry.continuationOf && !previous;
  const canOpen = !!previous && !!onOpenOriginal;
  return (
    <>
      {showFavorite && entry.favorite && (
        <View style={styles.favorite}>
          <Symbol name="bookmark.fill" size={13} color={theme.accent} />
          <Text style={[styles.metadata, { color: theme.muted }]}>
            Favorito
          </Text>
        </View>
      )}
      {!!entry.text && (
        <Text
          selectable={selectable}
          style={[styles.body, { color: theme.ink }]}
        >
          {entry.text}
        </Text>
      )}
      {photo && (
        <Image
          accessibilityLabel="Foto da entrada"
          source={{ uri: photo }}
          resizeMode={selectable ? "contain" : "cover"}
          style={styles.photo}
        />
      )}
      {(entry.continuationOf || quote !== undefined || quoteUri) && (
        <Pressable
          accessible={canOpen}
          accessibilityRole="button"
          accessibilityLabel="Ver entrada original"
          disabled={!canOpen}
          onPress={() => {
            if (previous) onOpenOriginal?.(previous);
          }}
          style={styles.quote}
        >
          {quoteUri && (
            <Image
              accessibilityLabel="Foto citada"
              source={{ uri: quoteUri }}
              style={styles.quoteThumbnail}
            />
          )}
          <View style={styles.quoteCopy}>
            <Text style={[styles.metadata, { color: theme.muted }]}>
              {previous
                ? `Continuação de ${new Date(previous.createdAt).toLocaleDateString("pt-BR", { dateStyle: "long" })}`
                : missing
                  ? "Origem excluída ou indisponível"
                  : "Continuação"}
            </Text>
            <Text
              numberOfLines={3}
              style={[styles.excerpt, { color: theme.ink }]}
            >
              {quote ||
                (quoteUri
                  ? "Foto"
                  : missing
                    ? "Citação indisponível"
                    : "Foto da entrada anterior")}
            </Text>
          </View>
          {canOpen && (
            <Symbol name="chevron.right" size={12} color={theme.muted} />
          )}
        </Pressable>
      )}
      {!!entry.tags?.length && (
        <Text style={styles.tags}>
          {entry.tags.map((tag) => `#${tag}`).join("  ")}
        </Text>
      )}
      {entry.reaction && <Text style={styles.reaction}>{entry.reaction}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 17, lineHeight: 24 },
  metadata: { fontSize: 13 },
  favorite: { flexDirection: "row", alignItems: "center", gap: 6 },
  photo: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 12,
    backgroundColor: "#F6F2E7",
  },
  quote: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF5F1",
    borderRadius: 10,
    padding: 10,
  },
  quoteThumbnail: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: "#F6F2E7",
  },
  quoteCopy: { flex: 1, gap: 2 },
  excerpt: { fontSize: 14 },
  tags: { color: "#79342D", fontSize: 13 },
  reaction: {
    alignSelf: "flex-end",
    backgroundColor: "#FFF5F1",
    paddingHorizontal: 6,
    borderRadius: 12,
    fontSize: 16,
  },
});
