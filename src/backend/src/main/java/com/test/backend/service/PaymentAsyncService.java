package com.test.backend.service;

import com.test.backend.dto.payment.PaymentDTO;
import com.test.backend.entity.booking.Booking;
import com.test.backend.entity.payment.Payment;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.BookingRepository;
import com.test.backend.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
public class PaymentAsyncService {

    private final BookingRepository bookingRepository;

    private final PaymentRepository paymentRepository;

    @Async
    public void createNewPayment(PaymentDTO paymentDTO) {
        Booking booking = bookingRepository.findByBookingId(paymentDTO.bookingId())
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        Payment newPayment = Payment.builder()
                .booking(booking)
                .stripeChargeId(paymentDTO.stripeChargeId())
                .amount(paymentDTO.amount())
                .currency(paymentDTO.currency())
                .status(paymentDTO.status())
                .receiptUrl(paymentDTO.receiptUrl())
                .failureMessage(paymentDTO.failureMessage())
                .build();

        paymentRepository.save(newPayment);
    }
}
