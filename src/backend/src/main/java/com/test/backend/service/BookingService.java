package com.test.backend.service;

import com.test.backend.dto.booking.FilterInterviewerPositionResponse;
import com.test.backend.entity.interviewerExpertise.InterviewerExpertise;
import com.test.backend.repository.InterviewerExpertiseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
public class BookingService {

    private final InterviewerExpertiseRepository interviewerExpertiseRepository;

    public void filterInterviewerByPosition(String position, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Page<InterviewerExpertise> expertisePage = interviewerExpertiseRepository
                .findAllByPositionWithBalancedSort(position, pageable);

        Page<FilterInterviewerPositionResponse> response =
                expertisePage.map(this::coverToFilterInterviewerPositionResponse);

    }

    private FilterInterviewerPositionResponse coverToFilterInterviewerPositionResponse(InterviewerExpertise epertise) {
        return FilterInterviewerPositionResponse.builder().build();
    }
}
