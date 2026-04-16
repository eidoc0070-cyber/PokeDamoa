/**
 * 실전 배틀에서 중요한 필드 및 환경 효과 데이터
 */

export interface FieldEffect {
    id: string;
    nameKo: string;
    nameEn: string;
    category: 'weather' | 'terrain' | 'room' | 'hazard' | 'side';
    description: string;
    details: string[];
}

export const FIELD_EFFECTS: FieldEffect[] = [
    // 날씨 (Weather)
    {
        id: 'sun',
        nameKo: '쾌청',
        nameEn: 'Harsh Sunlight',
        category: 'weather',
        description: '강한 햇살이 비치는 상태입니다.',
        details: [
            '불꽃 타입 기술의 위력이 1.5배 증가합니다.',
            '물 타입 기술의 위력이 0.5배 감소합니다.',
            '기술 [솔라빔], [솔라블레이드]를 충전 없이 즉시 사용합니다.',
            '기술 [광합성], [아침햇살], [달의불빛]의 회복량이 최대 HP의 2/3로 증가합니다.',
            '특성 [엽록소], [선파워], [고대활성] 등이 활성화됩니다.'
        ]
    },
    {
        id: 'rain',
        nameKo: '비바라기',
        nameEn: 'Rain',
        category: 'weather',
        description: '비가 내리는 상태입니다.',
        details: [
            '물 타입 기술의 위력이 1.5배 증가합니다.',
            '불꽃 타입 기술의 위력이 0.5배 감소합니다.',
            '기술 [번개], [폭풍]이 반드시 명중합니다.',
            '기술 [솔라빔], [솔라블레이드]의 위력이 절반으로 감소합니다.',
            '특성 [쓱쓱], [젖은접시], [건조피부] 등이 활성화됩니다.'
        ]
    },
    {
        id: 'sandstorm',
        nameKo: '모래바람',
        nameEn: 'Sandstorm',
        category: 'weather',
        description: '모래바람이 휘몰아치는 상태입니다.',
        details: [
            '바위 타입 포켓몬의 특수방어가 1.5배 증가합니다.',
            '바위, 땅, 강철 타입 이외의 포켓몬은 매 턴 최대 HP의 1/16만큼 데미지를 입습니다.',
            '기술 [솔라빔], [솔라블레이드]의 위력이 절반으로 감소합니다.',
            '특성 [모래헤치기], [모래힘], [모래숨기] 등이 활성화됩니다.'
        ]
    },
    {
        id: 'snow',
        nameKo: '설경',
        nameEn: 'Snow',
        category: 'weather',
        description: '눈이 내리는 상태입니다. (9세대부터 싸라기눈 대체)',
        details: [
            '얼음 타입 포켓몬의 방어가 1.5배 증가합니다.',
            '매 턴 데미지를 입히지 않습니다. (싸라기눈과의 차이점)',
            '기술 [보라매]가 반드시 명중합니다.',
            '특성 [눈치우기], [아이스바디] 등이 활성화됩니다.'
        ]
    },

    // 필드 (Terrain)
    {
        id: 'electric_terrain',
        nameKo: '일렉트릭필드',
        nameEn: 'Electric Terrain',
        category: 'terrain',
        description: '발밑에 전기가 흐르는 상태입니다.',
        details: [
            '지면에 있는 포켓몬의 전기 타입 기술 위력이 1.3배(8세대 이후) 증가합니다.',
            '지면에 있는 포켓몬은 [잠듦] 상태가 되지 않습니다.',
            '기술 [라이징볼트]의 위력이 2배가 됩니다.',
            '특성 [쿼크차지], [서핑테일] 등이 활성화됩니다.'
        ]
    },
    {
        id: 'grassy_terrain',
        nameKo: '그래스필드',
        nameEn: 'Grassy Terrain',
        category: 'terrain',
        description: '발밑에 풀이 우거진 상태입니다.',
        details: [
            '지면에 있는 포켓몬은 매 턴 최대 HP의 1/16을 회복합니다.',
            '지면에 있는 포켓몬의 풀 타입 기술 위력이 1.3배 증가합니다.',
            '기술 [지진], [구멍파기], [매그니튜드]의 위력이 0.5배로 감소합니다.',
            '기술 [그래스슬라이더]의 우선도가 +1이 됩니다.'
        ]
    },
    {
        id: 'misty_terrain',
        nameKo: '미스트필드',
        nameEn: 'Misty Terrain',
        category: 'terrain',
        description: '발밑에 안개가 자욱한 상태입니다.',
        details: [
            '지면에 있는 포켓몬은 상태 이상 및 [혼란]에 걸리지 않습니다.',
            '지면에 있는 포켓몬이 받는 드래곤 타입 기술의 데미지가 0.5배로 감소합니다.',
            '기술 [미스트버스트]의 위력이 1.5배가 됩니다.'
        ]
    },
    {
        id: 'psychic_terrain',
        nameKo: '사이코필드',
        nameEn: 'Psychic Terrain',
        category: 'terrain',
        description: '발밑에 이상한 힘이 넘치는 상태입니다.',
        details: [
            '지면에 있는 포켓몬의 에스퍼 타입 기술 위력이 1.3배 증가합니다.',
            '지면에 있는 포켓몬은 상대의 선공기에 맞지 않습니다.',
            '기술 [와이드포스]의 위력이 1.5배가 되고 광역기가 됩니다.'
        ]
    },

    // 룸 (Room)
    {
        id: 'trick_room',
        nameKo: '트릭룸',
        nameEn: 'Trick Room',
        category: 'room',
        description: '차원이 뒤틀려 스피드가 느린 포켓몬부터 행동합니다.',
        details: [
            '우선도가 같은 기술끼리 비교할 때, 스피드가 낮은 포켓몬이 먼저 행동합니다.',
            '우선도 자체가 바뀌지는 않습니다.',
            '5턴 동안 지속됩니다.'
        ]
    },
    {
        id: 'magic_room',
        nameKo: '매직룸',
        nameEn: 'Magic Room',
        category: 'room',
        description: '도구의 효과가 사라지는 공간을 만듭니다.',
        details: [
            '모든 포켓몬의 지닌물건 효과가 무효화됩니다.',
            '메가스톤, Z크리스탈 등 일부 특수 도구는 영향을 받지 않을 수 있습니다.',
            '5턴 동안 지속됩니다.'
        ]
    },
    {
        id: 'wonder_room',
        nameKo: '원더룸',
        nameEn: 'Wonder Room',
        category: 'room',
        description: '방어와 특수방어가 교체되는 공간을 만듭니다.',
        details: [
            '모든 포켓몬의 방어 실수값과 특수방어 실수값이 서로 바뀝니다.',
            '랭크 변화는 그대로 유지되나, 바뀐 능력치에 적용됩니다.',
            '5턴 동안 지속됩니다.'
        ]
    },

    // 엔트리 해저드 (Hazards)
    {
        id: 'stealth_rock',
        nameKo: '스텔스록',
        nameEn: 'Stealth Rock',
        category: 'hazard',
        description: '교체되어 나오는 상대에게 바위 타입 상성 데미지를 입힙니다.',
        details: [
            '바위 타입 상성에 따라 데미지가 결정됩니다. (최대 HP의 1/32 ~ 1/2)',
            '기합의띠, 멀티스케일 등을 무력화하는 데 매우 효과적입니다.'
        ]
    },
    {
        id: 'sticky_web',
        nameKo: '끈적끈적네트',
        nameEn: 'Sticky Web',
        category: 'hazard',
        description: '교체되어 나오는 상대의 스피드를 1랭크 떨어뜨립니다.',
        details: [
            '지면에 있는 포켓몬에게만 적용됩니다.',
            '클리어바디 등의 특성이나 도구에 의해 막힐 수 있습니다.'
        ]
    }
];
