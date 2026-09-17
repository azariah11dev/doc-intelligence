# ---------------------------------------------------------------------------------------
# file_magic
#----------------------------------------------------------------------------------------
import magic

def detect_mime_type(file_bytes: bytes) -> str:
    mime = magic.Magic(mime=True)
    return mime.from_buffer(file_bytes)

# ---------------------------------------------------------------------------------------
# Validators
#----------------------------------------------------------------------------------------
import mimetypes

ALLOWED_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
}

MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024

def validate_file_size(size: int):
    if size == 0:
        raise ValueError("Empty file.")
    if size > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Max allowed is {MAX_FILE_SIZE_MB}MB.")

def validate_file_type(magic_type: str, filename: str):
    guessed = mimetypes.guess_type(filename)[0]

    if magic_type not in ALLOWED_TYPES and guessed not in ALLOWED_TYPES:
        raise ValueError(f"Unsupported file type: {magic_type} / {guessed}")

# ---------------------------------------------------------------------------------------
# POST
#----------------------------------------------------------------------------------------