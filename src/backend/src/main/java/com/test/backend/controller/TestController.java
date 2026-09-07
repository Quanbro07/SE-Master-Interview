package com.test.backend.controller;

import com.test.backend.config.CVBucketConfig;
import com.test.backend.entity.booking.Booking;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.BookingRepository;
import com.test.backend.service.EmailService;
import com.test.backend.service.FileService;
import com.test.backend.stripe.PaymentEventService;
import com.test.backend.stripe.dto.PaymentEventDTO;
import io.minio.errors.MinioException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLConnection;
import java.util.UUID;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/test")
public class TestController {
    private final EmailService emailService;

    private final FileService fileService;

    private final BookingRepository bookingRepository;

    private final CVBucketConfig cvBucket;

    private final PaymentEventService paymentEventService;

    @PostMapping("/test-email/{bookingId}")
    public ResponseEntity<?> test(@PathVariable Long bookingId) {
        Booking booking = bookingRepository.findByBookingIdFetchInterviewerAndBooker(bookingId)
                .orElseThrow(() -> new NotFoundException("Booking Not found"));

        emailService.sendEmailsForSuccessfulPayment(booking);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/file/upload")
    public ResponseEntity<?> testUpload(@RequestParam("file") MultipartFile file) throws IOException, MinioException {

        String originalFileName = file.getOriginalFilename();

        String targetName = UUID.randomUUID().toString() + "_" + originalFileName;

        String contentType = file.getContentType();

        String url = fileService.uploadFile(cvBucket.getCVBucketName(), file.getBytes(), contentType, originalFileName, targetName);

        return ResponseEntity.ok(url);
    }

    @GetMapping("/test-limit")
    public String hello() {
        return "Hello World! YOu are within rate limit.";
    }

    @PostMapping("/trigger-payment/{bookingId}")
    public ResponseEntity<Void> trigger(@PathVariable Long bookingId) {
        paymentEventService.publishPaymentSuccess(
                bookingId,
                new PaymentEventDTO(bookingId, "PAID", "https://fake-receipt-url.com")
        );
        return ResponseEntity.ok().build();
    }
}
