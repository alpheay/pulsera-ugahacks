import { NativeTabs, Icon, Label, VectorIcon } from "expo-router/unstable-native-tabs"
import { DynamicColorIOS, Platform } from "react-native"
import { Feather } from "@expo/vector-icons"

const TAB_LABEL_COLOR =
  Platform.select({
    ios: DynamicColorIOS({ dark: "white", light: "black" }),
    default: "#FAFAFA",
  }) ?? "#FAFAFA"

const renderTabIcon = (sfDefault: string, sfSelected: string, androidName: string) => {
  const icon = Platform.select({
    ios: <Icon sf={{ default: sfDefault, selected: sfSelected }} />,
    android: <Icon src={<VectorIcon family={Feather} name={androidName} />} />,
  })

  return icon ?? <Icon sf={{ default: sfDefault, selected: sfSelected }} />
}

export default function MainTabLayout() {
  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      disableTransparentOnScrollEdge
      labelStyle={{ color: TAB_LABEL_COLOR, fontSize: 12, fontWeight: "600" }}
      tintColor={TAB_LABEL_COLOR}
    >
      <NativeTabs.Trigger name="home">
        <Label>Home</Label>
        {renderTabIcon("house", "house.fill", "home")}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="media">
        <Label>Media</Label>
        {renderTabIcon("play.circle", "play.circle.fill", "play-circle")}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        {renderTabIcon("gearshape", "gearshape.fill", "settings")}
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
