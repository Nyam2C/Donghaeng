import { router } from 'expo-router'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'

/**
 * Onboarding minimal repro — 진짜로 mount 되는지 검증.
 * 빨간 박스 + console.log. 보이면 컴포넌트는 OK,
 * 안 보이면 expo-router 의 / 매핑 자체 issue.
 */
export default function Onboarding() {
  useEffect(() => {
    console.log('[Onboarding] mounted at /')
  }, [])

  const handleStart = () => {
    router.replace('/home')
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#C24A36',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: 32, marginBottom: 24 }}>ONBOARDING</Text>
      <Text style={{ color: '#FFFFFF', fontSize: 16, marginBottom: 24 }}>보이면 컴포넌트 OK</Text>
      <Pressable
        onPress={handleStart}
        style={{
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 32,
          paddingVertical: 16,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#C24A36', fontSize: 18, fontWeight: '600' }}>시작하기</Text>
      </Pressable>
    </View>
  )
}
