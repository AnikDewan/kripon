import { Link, type Href } from 'expo-router';
import { Text, View } from 'react-native';

type Props = {
  title: string;
  actionLink?: { label: string; href: Href };
};

export function SectionHeading({ title, actionLink }: Props) {
  return (
    <View className="flex-row items-end justify-between">
      <Text className="text-[19px] font-bold tracking-[-0.45px] text-ink">{title}</Text>
      {actionLink ? (
        <Link href={actionLink.href} asChild>
          <Text className="pb-0.5 text-[12px] font-bold text-teal">{actionLink.label}</Text>
        </Link>
      ) : null}
    </View>
  );
}
