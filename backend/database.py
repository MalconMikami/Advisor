import uuid
from datetime import datetime
from sqlalchemy import create_engine, Column, String, DateTime, Float, Text, Integer, ForeignKey, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, relationship


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    advisor_name = Column(String, nullable=False)
    client_name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    language = Column(String, default="pt")
    created_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    summary = Column(Text, nullable=True)

    transcripts = relationship(
        "Transcript", back_populates="session", order_by="Transcript.timestamp"
    )


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    speaker_id = Column(Integer, nullable=False)
    speaker_name = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    timestamp = Column(Float, nullable=False)  # seconds from session start
    created_at = Column(DateTime, default=datetime.utcnow)
    # Sentiment fields (populated only for client utterances)
    emotion = Column(String, nullable=True)
    valence = Column(Float, nullable=True)
    arousal = Column(Float, nullable=True)
    emotion_confidence = Column(Float, nullable=True)
    emotion_keywords = Column(String, nullable=True)  # comma-separated

    session = relationship("Session", back_populates="transcripts")


engine = create_engine(
    "sqlite:///./transcription.db", connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)
    _migrate_sentiment_columns()


def _migrate_sentiment_columns():
    """Adiciona colunas de sentimento se não existirem (safe para DBs existentes)."""
    new_cols = {
        "emotion": "VARCHAR",
        "valence": "FLOAT",
        "arousal": "FLOAT",
        "emotion_confidence": "FLOAT",
        "emotion_keywords": "VARCHAR",
    }
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(transcripts)"))
        existing = {row[1] for row in result.fetchall()}
        for col, col_type in new_cols.items():
            if col not in existing:
                conn.execute(text(f"ALTER TABLE transcripts ADD COLUMN {col} {col_type}"))
        conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
