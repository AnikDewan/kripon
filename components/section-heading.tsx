import { Text } from 'react-native';

export function SectionHeading({ title }: { title: string }) {
  return <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-ink-muted">{title}</Text>;
}
