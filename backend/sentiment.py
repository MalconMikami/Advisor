"""
Análise de sentimento/emoção via GPT-4o com structured output (Pydantic).
Analisa somente utterances do CLIENTE para fornecer temperatura emocional ao assessor.
"""
from __future__ import annotations

from typing import Literal

from openai import AsyncOpenAI
from pydantic import BaseModel, Field


class EmotionResult(BaseModel):
    emotion: Literal["joy", "sadness", "anger", "fear", "surprise", "disgust", "neutral"]
    valence: float = Field(
        description="Valência emocional de -1.0 (muito negativo) a +1.0 (muito positivo)"
    )
    arousal: float = Field(
        description="Nível de ativação de 0.0 (calmo/passivo) a 1.0 (muito agitado/intenso)"
    )
    confidence: float = Field(description="Confiança na classificação de 0.0 a 1.0")
    keywords: list[str] = Field(
        description="Até 5 palavras-chave que indicaram a emoção identificada"
    )


_SYSTEM_PROMPT = """Você é um especialista em análise emocional de conversas entre assessores financeiros e seus clientes.

Analise o texto de um CLIENTE em uma reunião de assessoria de investimentos.
Identifique a emoção predominante e retorne os dados estruturados.

Emoções disponíveis:
- joy (alegria): satisfação, entusiasmo, conforto, otimismo com resultados
- sadness (tristeza): decepção, frustração com perdas, melancolia
- anger (raiva): insatisfação intensa, sentimento de injustiça ou traição
- fear (medo): ansiedade, preocupação com risco, incerteza sobre o futuro financeiro
- surprise (surpresa): reação a informação inesperada, seja positiva ou negativa
- disgust (aversão): rejeição a produto, estratégia ou proposta específica
- neutral (neutro): tom informativo, objetivo, sem carga emocional clara

Considere o contexto financeiro: termos como "risco", "perda", "volatilidade" geralmente
indicam medo mesmo em frases aparentemente neutras. "Rendimento acima do esperado" indica alegria.

Retorne keywords: máximo 5 palavras que mais evidenciaram a emoção identificada."""


class SentimentAnalyzer:
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)

    async def analyze(self, text: str) -> EmotionResult:
        """Analisa o texto e retorna estrutura de emoção."""
        response = await self.client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            response_format=EmotionResult,
            temperature=0.1,
        )
        return response.choices[0].message.parsed
