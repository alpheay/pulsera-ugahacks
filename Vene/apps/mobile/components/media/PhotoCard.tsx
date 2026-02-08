import React from "react"
import { TouchableOpacity, View, Text } from "react-native"
import { Image } from "expo-image"

interface PhotoCardProps {
  photo: {
    id: number
    url: string
    semanticDescription: string
  }
  onPress: () => void
}

export function PhotoCard({ photo, onPress }: PhotoCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="aspect-square w-full rounded-2xl overflow-hidden bg-card relative shadow-sm"
    >
      <Image
        source={{ uri: photo.url }}
        style={{ flex: 1 }}
        contentFit="cover"
        transition={200}
        accessibilityLabel={photo.semanticDescription}
      />
      
      <View className="absolute bottom-2 left-2 right-2 bg-card/75 p-2.5 rounded-xl border border-white/10 shadow-md">
        <Text 
          numberOfLines={2} 
          className="text-xs font-medium text-foreground leading-snug"
        >
          {photo.semanticDescription}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
