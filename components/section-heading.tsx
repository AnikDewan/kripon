import { Text, View } from 'react-native';

export function SectionHeading({ title, action }: { title: string; action?: string }) {
  return (
    <View className="flex-row items-end justify-between">
      <Text className="text-[19px] font-bold tracking-[-0.45px] text-ink">{title}</Text>
      {action ? <Text className="pb-0.5 text-[12px] font-bold text-teal">{action}</Text> : null}
    </View>
  );
}
