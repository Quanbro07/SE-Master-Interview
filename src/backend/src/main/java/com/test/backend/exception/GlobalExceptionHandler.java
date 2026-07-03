package com.test.backend.exception;

import com.test.backend.exception.customException.AlreadyExistException;
import com.test.backend.exception.customException.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<?> handleNotFound(NotFoundException e) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.NOT_FOUND.value(),
                                HttpStatus.NOT_FOUND.getReasonPhrase(),
                                e.getMessage()
                        )
                );
    }

    @ExceptionHandler(AlreadyExistException.class)
    public ResponseEntity<?> handleAlreadyExist(AlreadyExistException e) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.NOT_FOUND.value(),
                                HttpStatus.NOT_FOUND.getReasonPhrase(),
                                e.getMessage()
                        )
                );
    }
}
