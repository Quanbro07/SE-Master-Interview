package com.test.backend.exception;

import com.test.backend.exception.customException.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Exception Handle Not Found
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

    // Exception Handle Aldready Exists
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

    // Exception Handle Role Call Invalid Operation
    @ExceptionHandler(ForbiddenOperationException.class)
    public ResponseEntity<?> handleForbiddenOperation(ForbiddenOperationException e) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.UNAUTHORIZED.value(),
                                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                                e.getMessage()
                        )
                );
    }

    // Exception handle Stripe Integration
    @ExceptionHandler(StripeIntegrationException.class)
    public ResponseEntity<?> handleAlreadyExist(StripeIntegrationException e) {
        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.BAD_GATEWAY.value(),
                                HttpStatus.BAD_GATEWAY.getReasonPhrase(),
                                e.getMessage()
                        )
                );
    }

    // Exception handle Stripe Integration
    @ExceptionHandler(EmptyInputException.class)
    public ResponseEntity<?> handleEmptyInput(EmptyInputException e) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.BAD_REQUEST.value(),
                                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                                e.getMessage()
                        )
                );
    }

    // Exception handle Schedule
    @ExceptionHandler(ScheduleConflictException.class)
    public ResponseEntity<?> handleScheduleConflict(ScheduleConflictException e) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.CONFLICT.value(),
                                HttpStatus.CONFLICT.getReasonPhrase(),
                                e.getMessage()
                        )
                );
    }

    // Exception handle Error Type
    @ExceptionHandler(ErrorTypeException.class)
    public ResponseEntity<?> handleErrprType(ErrorTypeException e) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.CONFLICT.value(),
                                HttpStatus.CONFLICT.getReasonPhrase(),
                                e.getMessage()
                        )
                );
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<?> handleEmptyInput(InvalidTokenException e) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.UNAUTHORIZED.value(),
                                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                                e.getMessage()
                        )
                );
    }

    @ExceptionHandler(BlacklistTokenException.class)
    public ResponseEntity<?> handleBlackListToken(BlacklistTokenException e) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.UNAUTHORIZED.value(),
                                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                                e.getMessage()
                        )
                );
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Object> handleAuthenticationException(AuthenticationException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.UNAUTHORIZED.value(),
                                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                                ex.getMessage()
                        )
                );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(
                        new ErrorResponse(
                                LocalDateTime.now().toString(),
                                HttpStatus.BAD_REQUEST.value(),
                                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                                e.getMessage() // Sẽ in ra đúng: "Error - Booking! startTime must be before endTime"
                        )
                );
    }
}
