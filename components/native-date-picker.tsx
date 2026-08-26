import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
  value: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
};

/**
 * Presents the OS date picker directly: the native Android dialog on Android,
 * and a bottom sheet holding the native spinner on iOS (no stray inline element).
 * The parent must unmount this component after every callback so a fresh picker
 * instance mounts on each open - that is what keeps the Android dialog reopening
 * after a cancellation.
 */
export function NativeDatePicker({ value, maximumDate, onConfirm, onCancel }: Props) {
  const [draft, setDraft] = useState(value);

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        maximumDate={maximumDate}
        onValueChange={(_, date) => onConfirm(date)}
        onDismiss={onCancel}
      />
    );
  }

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onCancel}>
      <Pressable className="flex-1 justify-end bg-black/30" onPress={onCancel} accessibilityLabel="Dismiss date picker">
        <Pressable className="gap-1 rounded-t-3xl bg-white px-5 pb-8 pt-4" onPress={() => undefined}>
          <Text className="text-[15px] font-bold text-ink">Pick a date</Text>
          <DateTimePicker value={draft} mode="date" display="spinner" maximumDate={maximumDate} onChange={(_, date) => { if (date) setDraft(date); }} />
          <View className="mt-2 flex-row gap-2">
            <Pressable onPress={onCancel} className="flex-1 items-center rounded-xl bg-mist py-3 active:opacity-80"><Text className="text-[14px] font-bold text-ink">Cancel</Text></Pressable>
            <Pressable onPress={() => onConfirm(draft)} className="flex-1 items-center rounded-xl bg-teal py-3 active:opacity-80"><Text className="text-[14px] font-bold text-white">Done</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
