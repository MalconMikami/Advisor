"""
Geração de resumo de reunião usando GPT-4o.
"""

from openai import AsyncOpenAI


class SummaryGenerator:
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)

    async def generate(self, session: dict, transcripts: list[dict]) -> str:
        advisor = session.get("advisor_name", "Assessor")
        client = session.get("client_name", "Cliente")

        transcript_text = "\n".join(
            f"[{t['speaker_name']}]: {t['text']}" for t in transcripts
        )

        prompt = f"""Você é um assistente especializado em análise de reuniões entre assessores financeiros e clientes.

Analise a transcrição abaixo de uma reunião entre {advisor} (assessor) e {client} (cliente) e gere um resumo estruturado.

TRANSCRIÇÃO:
{transcript_text}

Gere o resumo com estas seções exatas:

## Resumo Executivo
(visão geral em 2-3 frases)

## Principais Tópicos Discutidos
(lista com os assuntos abordados)

## Decisões e Acordos
(o que foi decidido ou combinado)

## Próximos Passos
(ações a serem tomadas, com responsável se mencionado)

## Pontos de Atenção
(preocupações, riscos ou itens que merecem acompanhamento)

Responda em português brasileiro. Seja objetivo e preciso."""

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )

        return response.choices[0].message.content
