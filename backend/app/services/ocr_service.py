import io
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from pydantic import BaseModel
from PIL import Image, ImageOps
import numpy as np

logger = logging.getLogger(__name__)

class OCRLine(BaseModel):
    text: str
    confidence: float
    box: List[List[float]]

class OCRExtractionResult(BaseModel):
    text: str
    confidence: float
    lines_count: int
    lines: List[OCRLine]
    is_clear: bool

class OCRService:
    """
    ML-сервис оптического распознавания текста (OCR) для учебных материалов:
    страниц школьных учебников, конспектов тетрадей и записей на классной доске.
    Опирается на нейросетевой пайплайн PP-OCRv4 в ONNX Runtime (CPU инференс ~150-300 мс).
    """
    def __init__(self):
        self._engine = None

    @property
    def engine(self):
        if self._engine is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                # Инициализация легковесного движка на CPU
                self._engine = RapidOCR()
                logger.info("RapidOCR (PP-OCRv4 ONNX) успешно инициализирован на CPU.")
            except Exception as e:
                logger.error("Не удалось инициализировать RapidOCR: %s", e)
                raise RuntimeError(f"Ошибка загрузки OCR-движка: {e}") from e
        return self._engine

    def _prepare_image(self, image_input: Union[bytes, Image.Image, np.ndarray]) -> np.ndarray:
        """
        Предобработка входного изображения:
        - декодирование из байт
        - исправление ориентации по EXIF тегам мобильных камер
        - масштабирование гигантских фото (до 2048px по длинной стороне) для ускорения
        """
        if isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
            img = image_input
        elif isinstance(image_input, np.ndarray):
            return image_input
        else:
            raise ValueError(f"Неподдерживаемый тип входного изображения: {type(image_input)}")

        # Автоповорот согласно EXIF метаданным фото со смартфона
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        # Конвертация в RGB
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Ограничение максимального разрешения для ультрабыстрого CPU-инференса (<300 мс)
        max_dim = 2048
        w, h = img.size
        if max(w, h) > max_dim:
            scale = max_dim / max(w, h)
            new_w, new_h = int(w * scale), int(h * scale)
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            logger.debug("Изображение уменьшено с %sx%s до %sx%s", w, h, new_w, new_h)

        return np.array(img)

    def extract_text(self, image_input: Union[bytes, Image.Image, np.ndarray]) -> OCRExtractionResult:
        """
        Распознаёт текст на изображении учебника / конспекта / доски.
        Группирует строки в естественном порядке чтения (сверху вниз, слева направо).
        """
        np_img = self._prepare_image(image_input)

        try:
            ocr_results, elapse = self.engine(np_img)
        except Exception as e:
            logger.error("Ошибка при инференсе OCR: %s", e)
            raise RuntimeError(f"Сбой распознавания текста нейросетью: {e}") from e

        if not ocr_results:
            logger.warning("OCR не обнаружил печатного или рукописного текста на фото.")
            return OCRExtractionResult(
                text="",
                confidence=0.0,
                lines_count=0,
                lines=[],
                is_clear=False
            )

        # Сортировка блоков текста по вертикали (y) и затем по горизонтали (x)
        # ocr_results: list of [box, text, score]
        # box: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
        def get_top_y(item):
            box = item[0]
            return min(p[1] for p in box)

        def get_left_x(item):
            box = item[0]
            return min(p[0] for p in box)

        # Сортируем: группируем строки с похожим Y (в пределах 15 пикселей)
        sorted_results = sorted(ocr_results, key=lambda it: (round(get_top_y(it) / 16) * 16, get_left_x(it)))

        lines: List[OCRLine] = []
        text_lines: List[str] = []
        confidences: List[float] = []

        for box, text_raw, score in sorted_results:
            clean_text = str(text_raw).strip()
            score_val = float(score)

            # Отсекаем явный графический шум с низкой достоверностью
            if score_val < 0.30 or not clean_text:
                continue

            lines.append(
                OCRLine(
                    text=clean_text,
                    confidence=round(score_val, 3),
                    box=box
                )
            )
            text_lines.append(clean_text)
            confidences.append(score_val)

        avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
        full_text = "\n".join(text_lines)

        return OCRExtractionResult(
            text=full_text,
            confidence=round(avg_conf, 3),
            lines_count=len(text_lines),
            lines=lines,
            is_clear=bool(avg_conf >= 0.60 and len(full_text) >= 15)
        )

ocr_service = OCRService()
