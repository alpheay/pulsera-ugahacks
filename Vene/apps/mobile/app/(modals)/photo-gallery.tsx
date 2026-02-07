import { useEffect, useState } from "react"
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Dimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Image } from "expo-image"
import { useSession } from "../../lib/auth"
import { GradientBackground } from "../../components/GradientBackground"
import { useMediaStore } from "../../store/useMediaStore"
import { Ionicons } from "@expo/vector-icons"
import type { Photo } from "../../lib/api"

const SCREEN_WIDTH = Dimensions.get("window").width
const PHOTO_GAP = 12
const PHOTO_PADDING = 24
const PHOTO_WIDTH = (SCREEN_WIDTH - PHOTO_PADDING - PHOTO_GAP) / 2

export default function PhotoGalleryModalScreen() {
  const router = useRouter()
  const { data: session } = useSession()
  
  const photos = useMediaStore((s) => s.photos)
  const isLoading = useMediaStore((s) => s.isLoadingPhotos)
  const fetchPhotos = useMediaStore((s) => s.fetchPhotos)
  
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (session?.session?.token) {
      fetchPhotos(session.session.token)
    }
  }, [session?.session?.token, fetchPhotos])

  const handleRefresh = async () => {
    if (!session?.session?.token) return
    setIsRefreshing(true)
    await fetchPhotos(session.session.token)
    setIsRefreshing(false)
  }

  const handleAddPhoto = () => {
    router.push("/(modals)/add-photo")
  }

  const handleClose = () => {
    router.back()
  }

  const handlePhotoPress = (photo: Photo) => {
    router.push({
      pathname: "/(modals)/edit-photo",
      params: {
        photoId: String(photo.id),
        url: photo.url,
        semanticDescription: photo.semanticDescription,
      },
    })
  }

  return (
    <GradientBackground variant="welcome">
      <View className="flex-1 bg-background/80">
        <SafeAreaView className="flex-1">
          <View className="flex-row items-center justify-between px-4 pt-6 pb-4">
            <TouchableOpacity
              onPress={handleClose}
              className="flex-row items-center"
            >
              <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.8)" />
              <Text className="text-body text-white/80 ml-1">Back</Text>
            </TouchableOpacity>
            
            <Text className="text-headline font-semibold text-white">
              Photos
            </Text>
            
            <TouchableOpacity
              onPress={handleAddPhoto}
              className="w-10 h-10 items-center justify-center rounded-full bg-white/10 border border-white/15"
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#ffffff"
              />
            }
          >
            {photos.length === 0 && !isLoading ? (
              <View className="py-20 items-center">
                <Ionicons name="images-outline" size={64} color="rgba(255,255,255,0.15)" />
                <Text className="text-body text-white/40 mt-4">No photos yet</Text>
                <TouchableOpacity
                  onPress={handleAddPhoto}
                  className="mt-4 px-6 py-3 rounded-full bg-white/10 border border-white/15"
                >
                  <Text className="text-body text-white/80">Add First Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row flex-wrap" style={{ gap: PHOTO_GAP }}>
                {photos.map((photo) => (
                  <TouchableOpacity
                    key={photo.id}
                    onPress={() => handlePhotoPress(photo)}
                    activeOpacity={0.8}
                    style={{ width: PHOTO_WIDTH }}
                  >
                    <View className="aspect-square rounded-2xl overflow-hidden bg-card relative shadow-sm">
                      <Image
                        source={{ uri: photo.url }}
                        style={{ flex: 1 }}
                        contentFit="cover"
                        transition={200}
                      />
                      <View className="absolute bottom-2 left-2 right-2 bg-card/75 p-2.5 rounded-xl border border-white/10 shadow-md">
                        <Text 
                          numberOfLines={2} 
                          className="text-xs font-medium text-foreground leading-snug"
                        >
                          {photo.semanticDescription}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </GradientBackground>
  )
}
