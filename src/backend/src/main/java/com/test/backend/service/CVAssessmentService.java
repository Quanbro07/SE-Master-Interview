package com.test.backend.service;

import com.test.backend.dto.cvAssessment.CVAssessmentResponse;
import com.test.backend.entity.position.Position;
import com.test.backend.entity.user.interviewee.Interviewee;
import com.test.backend.exception.customException.NotFoundException;
import com.test.backend.repository.IntervieweeRepository;
import com.test.backend.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class CVAssessmentService {

    private final IntervieweeRepository intervieweeRepository;

    private final InternalAPIService internalAPIService;

    private final PositionRepository positionRepository;

    private final CVAsyncHandlerService cvAsyncHandlerService;

    public CVAssessmentResponse assessCV(Long userId, String positionStr, MultipartFile file) {

        Optional<Position> position = positionRepository.findByPositionNameIgnoreCase(positionStr);

        if(position.isEmpty()) {
            throw new NotFoundException("Position not found");
        }
        Position po = position.get();
        CVAssessmentResponse response = internalAPIService.assessCV(file, po.getPositionName());

        Interviewee interviewee = intervieweeRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Interviewee not found"));
        Position positionGet = position.get();

        byte[] fileData = null;
        try {
            fileData = file.getBytes();
        } catch (IOException e) {
            throw new RuntimeException("Error - Get Bytes of File Data" + e);
        }

        String contentType = file.getContentType();

        cvAsyncHandlerService.saveCVAssessmentAndUploadFileAsync(interviewee, positionGet, response, fileData, contentType);


        return response;
    }
}
