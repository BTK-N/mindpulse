export type Language = 'English' | 'Urdu';

export interface UserAuthResponse {
  status: string;
  username: string;
  message: string;
}

export interface DiagnosisInput {
  age: number;
  gender: number;
  relationship: number;
  occupation: number;
  org_type: number;
  platforms: number;
  usage_hours: number;
  purposeless: number;
  distracted: number;
  restless: number;
  concentration: number;
  focus_issue: number;
  comparison: number;
  comparison_feelings: number;
  validation: number;
  interest_fluctuation: number;
  username?: string;
  language?: Language;
}

export interface DiagnosisScores {
  addiction_score: number;
  behavior_score: number;
  mental_score: number;
  overall_score: number;
}

export interface DiagnosisResult {
  status: string;
  scores: DiagnosisScores;
  ml_results: {
    predicted_risk: 'Low' | 'Medium' | 'High' | string;
    overall_score: number;
    probabilities: Record<string, number>;
  };
  ai_consultation: string;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface GoalItem {
  id: number;
  username: string;
  goal_text: string;
  completed: boolean;
  date: string;
}

export interface HistoryItem {
  id: number;
  username: string;
  date: string;
  risk_level: string;
  impact_score: number;
  ai_consult: string;
  can_rescore?: boolean;
  usage_hours?: number | null;
}

export interface RescoreResult {
  original: {
    history_id: number;
    usage_hours: number;
    risk_level: string;
    impact_score: number;
  };
  corrected: {
    usage_hours: number;
    risk_level: string;
    impact_score: number;
    probabilities?: Record<string, number>;
  };
  delta_hours: number;
  delta_impact: number;
}

export interface BenchmarkModel {
  model: string;
  accuracy: number;
  cv_mean: number;
  is_best: boolean;
}

export interface FeatureWeight {
  feature: string;
  importance: number;
}

export interface ModelInsightsData {
  status: string;
  benchmark_models: BenchmarkModel[];
  feature_weights: FeatureWeight[];
}
