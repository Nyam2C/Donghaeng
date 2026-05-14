/**
 * 여행 탭 = 현장 컴패니언 카드 뷰 (Phase 4a).
 *
 * 별도 stack push 보다 친구가 옆에 있는 리듬에 맞게 inline 으로 띄움.
 * companion.tsx 의 default export 를 그대로 재호출.
 */
import Companion from '../companion'

export default function Travel() {
  return <Companion />
}
