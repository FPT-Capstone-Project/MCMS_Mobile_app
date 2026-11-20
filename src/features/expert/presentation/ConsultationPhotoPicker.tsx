import React, { useState } from 'react';
import { Image, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AppButton, AppText } from '../../../shared/components';

export function ConsultationPhotoPicker({ photo, onChange, disabled = false }: {
  photo: ImagePicker.ImagePickerAsset | null;
  onChange: (photo: ImagePicker.ImagePickerAsset | null) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState('');
  const pick = async () => {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled) {
        const selected = result.assets[0];
        if (selected.fileSize && selected.fileSize > 25 * 1024 * 1024) {
          setError('Vui lòng chọn ảnh nhỏ hơn 25 MB.');
          return;
        }
        onChange(selected);
      }
    } catch { setError('Không mở được thư viện ảnh. Vui lòng thử lại.'); }
  };
  return <View style={{ gap: 8 }}>
    {photo && <Image source={{ uri: photo.uri }} style={{ width: 160, height: 140, borderRadius: 12 }} accessibilityLabel="Ảnh đính kèm" />}
    <AppButton title={photo ? 'Đổi ảnh' : 'Đính kèm ảnh'} variant="outline" size="sm" disabled={disabled} onPress={() => void pick()} />
    {photo && <AppButton title="Bỏ ảnh" variant="ghost" size="sm" disabled={disabled} onPress={() => onChange(null)} />}
    {!!error && <AppText>{error}</AppText>}
  </View>;
}
