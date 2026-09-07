package com.test.backend.stripe;

import com.test.backend.stripe.dto.PaymentEventDTO;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PaymentEventService {
    // Mỗi bookingId có 1 sink riêng, để nhiều client không lẫn event của nhau
    private final Map<Long, Sinks.Many<PaymentEventDTO>> sinkMap = new ConcurrentHashMap<>();

    // Frontend gọi hàm này để "đăng ký" lắng nghe theo bookingId
    public Flux<PaymentEventDTO> subscribe(Long bookingId) {
        Sinks.Many<PaymentEventDTO> sink = sinkMap.computeIfAbsent(
                bookingId,
                key -> Sinks.many().multicast().onBackpressureBuffer()
        );

        return sink.asFlux()
                .doFinally(signalType -> {
                    // Dọn dẹp sink khi client disconnect (đóng tab, timeout...)
                    sinkMap.remove(bookingId);
                });
    }

    // Backend gọi hàm này khi thanh toán xong, để bắn event xuống frontend
    public void publishPaymentSuccess(Long bookingId, PaymentEventDTO event) {
        Sinks.Many<PaymentEventDTO> sink = sinkMap.get(bookingId);
        if (sink != null) {
            sink.tryEmitNext(event);
            sink.tryEmitComplete(); // đóng stream sau khi gửi xong (nếu chỉ cần bắn 1 lần)
        }
    }
}
