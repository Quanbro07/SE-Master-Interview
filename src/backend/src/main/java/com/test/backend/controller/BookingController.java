package com.test.backend.controller;

import com.test.backend.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RequiredArgsConstructor
@RestController
@RequestMapping("api/v1/booking")
public class BookingController {

    private final BookingService bookingService;

    @GetMapping("/filter-interviewer-by-position")
    public ResponseEntity<?> filterInterviewerByPosition(
            @RequestParam("position") String position,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        bookingService.filterInterviewerByPosition(position, page, size);

        return ResponseEntity.ok().build();
    }
}
