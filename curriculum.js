export const units = [
  { id: 1, title: "Personas", description: "Quiénes aparecen en una conversación cotidiana." },
  { id: 2, title: "Objetos cotidianos", description: "Cosas que ves y usás todos los días." },
  { id: 3, title: "Lugares", description: "Espacios básicos para orientarte." },
  { id: 4, title: "Comida y bebida", description: "Vocabulario útil para comer y pedir." },
  { id: 5, title: "Verbos básicos", description: "Acciones frecuentes en forma de diccionario." },
  { id: 6, title: "Expresiones diarias", description: "Tiempo, ubicación y cortesía esencial." }
];

const entry = (id, hangul, meaning, romanization, category, unit, example) => ({
  id, hangul, meaning, romanization, category, unit, ...(example ? { example } : {})
});

export const curriculum = [
  entry("u1-01", "나", "yo (informal)", "na", "personas", 1, { ko: "나는 학생이에요.", es: "Yo soy estudiante." }),
  entry("u1-02", "저", "yo (cortés)", "jeo", "personas", 1, { ko: "저는 민수예요.", es: "Yo soy Minsu." }),
  entry("u1-03", "사람", "persona", "saram", "personas", 1),
  entry("u1-04", "친구", "amigo/a", "chingu", "personas", 1, { ko: "제 친구예요.", es: "Es mi amigo/a." }),
  entry("u1-05", "가족", "familia", "gajok", "personas", 1),
  entry("u1-06", "어머니", "madre", "eomeoni", "personas", 1),
  entry("u1-07", "아버지", "padre", "abeoji", "personas", 1),
  entry("u1-08", "아이", "niño/a", "ai", "personas", 1),
  entry("u1-09", "선생님", "profesor/a", "seonsaengnim", "personas", 1),
  entry("u1-10", "학생", "estudiante", "haksaeng", "personas", 1),

  entry("u2-01", "물건", "objeto / cosa", "mulgeon", "objetos", 2),
  entry("u2-02", "책", "libro", "chaek", "objetos", 2, { ko: "책을 읽어요.", es: "Leo un libro." }),
  entry("u2-03", "연필", "lápiz", "yeonpil", "objetos", 2),
  entry("u2-04", "펜", "bolígrafo", "pen", "objetos", 2),
  entry("u2-05", "가방", "bolso / mochila", "gabang", "objetos", 2),
  entry("u2-06", "의자", "silla", "uija", "objetos", 2),
  entry("u2-07", "책상", "escritorio", "chaeksang", "objetos", 2),
  entry("u2-08", "문", "puerta", "mun", "objetos", 2),
  entry("u2-09", "열쇠", "llave", "yeolsoe", "objetos", 2),
  entry("u2-10", "휴대폰", "teléfono móvil", "hyudaepon", "objetos", 2),

  entry("u3-01", "집", "casa / hogar", "jip", "lugares", 3, { ko: "집에 가요.", es: "Voy a casa." }),
  entry("u3-02", "학교", "escuela", "hakgyo", "lugares", 3),
  entry("u3-03", "회사", "empresa / oficina", "hoesa", "lugares", 3),
  entry("u3-04", "가게", "tienda", "gage", "lugares", 3),
  entry("u3-05", "식당", "restaurante", "sikdang", "lugares", 3),
  entry("u3-06", "카페", "cafetería", "kape", "lugares", 3),
  entry("u3-07", "병원", "hospital", "byeongwon", "lugares", 3),
  entry("u3-08", "은행", "banco", "eunhaeng", "lugares", 3),
  entry("u3-09", "공원", "parque", "gongwon", "lugares", 3),
  entry("u3-10", "화장실", "baño", "hwajangsil", "lugares", 3, { ko: "화장실이 어디예요?", es: "¿Dónde está el baño?" }),

  entry("u4-01", "물", "agua", "mul", "comida", 4, { ko: "물을 마셔요.", es: "Bebo agua." }),
  entry("u4-02", "밥", "arroz cocido / comida", "bap", "comida", 4),
  entry("u4-03", "음식", "comida", "eumsik", "comida", 4),
  entry("u4-04", "빵", "pan", "ppang", "comida", 4),
  entry("u4-05", "우유", "leche", "uyu", "comida", 4),
  entry("u4-06", "커피", "café", "keopi", "comida", 4),
  entry("u4-07", "차", "té", "cha", "comida", 4),
  entry("u4-08", "사과", "manzana", "sagwa", "comida", 4),
  entry("u4-09", "김치", "kimchi", "gimchi", "comida", 4),
  entry("u4-10", "고기", "carne", "gogi", "comida", 4),

  entry("u5-01", "가다", "ir", "gada", "verbos", 5, { ko: "학교에 가요.", es: "Voy a la escuela." }),
  entry("u5-02", "오다", "venir", "oda", "verbos", 5),
  entry("u5-03", "먹다", "comer", "meokda", "verbos", 5, { ko: "밥을 먹어요.", es: "Como." }),
  entry("u5-04", "마시다", "beber", "masida", "verbos", 5),
  entry("u5-05", "보다", "ver / mirar", "boda", "verbos", 5),
  entry("u5-06", "듣다", "escuchar", "deutda", "verbos", 5),
  entry("u5-07", "읽다", "leer", "ikda", "verbos", 5),
  entry("u5-08", "쓰다", "escribir", "sseuda", "verbos", 5),
  entry("u5-09", "자다", "dormir", "jada", "verbos", 5),
  entry("u5-10", "하다", "hacer", "hada", "verbos", 5),

  entry("u6-01", "오늘", "hoy", "oneul", "expresiones", 6),
  entry("u6-02", "내일", "mañana", "naeil", "expresiones", 6),
  entry("u6-03", "지금", "ahora", "jigeum", "expresiones", 6),
  entry("u6-04", "여기", "aquí", "yeogi", "expresiones", 6),
  entry("u6-05", "저기", "allí", "jeogi", "expresiones", 6),
  entry("u6-06", "안녕하세요", "hola", "annyeonghaseyo", "expresiones", 6),
  entry("u6-07", "감사합니다", "gracias", "gamsahamnida", "expresiones", 6),
  entry("u6-08", "네", "sí", "ne", "expresiones", 6),
  entry("u6-09", "아니요", "no", "aniyo", "expresiones", 6),
  entry("u6-10", "좋아요", "está bien / me gusta", "joayo", "expresiones", 6)
];

export const curriculumById = new Map(curriculum.map((word) => [word.id, word]));

