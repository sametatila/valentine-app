export type AnimationAction = "idle" | "walk" | "hug";
export type BearCharacter = "male" | "female";

export type SceneState = "questions" | "hug" | "heart" | "done_nonperfect";

export interface AppState {
  step: number; // 0–4
  answers: (boolean | null)[];
  scene: SceneState;
  closeness: number; // 0–5
}

export const INITIAL_STATE: AppState = {
  step: 0,
  answers: [null, null, null, null, null],
  scene: "questions",
  closeness: 0,
};

export interface Question {
  id: number;
  text: string;
  positiveLabel: string;
  negativeLabel: string;
}

export const QUESTIONS: Question[] = [
  {
    id: 0,
    text: "Samedov'un bir zamanlar zeytinlerine hayran olduğu mekanın adı nedir?",
    positiveLabel: "Varuna Gezgin",
    negativeLabel: "IF Sokak",
  },
  {
    id: 1,
    text: "Beraber yolda yatıp gökyüzünü izlerken motorlu adam tarafından basıldığımız il ve zaman hangisidir?",
    positiveLabel: "Hatay, deprem sonrası",
    negativeLabel: "Adana, şırdan sonrası",
  },
  {
    id: 2,
    text: "Eceov kaç kere taşınmıştır?",
    positiveLabel: "876 milyon milyor kere",
    negativeLabel: "Hiç taşınmamıştır",
  },
  {
    id: 3,
    text: "Babayın adamlardan kaçarken yanımızdaki 3.tekil şahıs kimdir?",
    positiveLabel: "Ece'nin Ece'si",
    negativeLabel: "Yıldız Tilbe",
  },
  {
    id: 4,
    text: "Seni ne kadar çok sevdiğimi anlatabilir miyim?",
    positiveLabel: "Cosmos nedir ne işe yarar",
    negativeLabel: "Anlatamazsın bi kerem",
  },
];
