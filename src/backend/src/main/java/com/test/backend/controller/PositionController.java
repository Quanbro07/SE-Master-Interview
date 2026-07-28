package com.test.backend.controller;

import com.test.backend.entity.position.Position;
import com.test.backend.repository.PositionRepository;
import com.test.backend.service.AutoCompleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/position")
public class PositionController {
    private final AutoCompleteService autoCompleteService;

    private final PositionRepository positionRepository;

    @GetMapping("/search")
    public ResponseEntity<List<String>> searchByName(
            @RequestParam("q") String query) {
        List<String> response = autoCompleteService.search(query);

        return ResponseEntity.ok(response);
    }

    @GetMapping("get-all")
    public ResponseEntity<List<String>> getAllPositions() {
        List<String> response = positionRepository.findAll().stream()
                .map(Position::getPositionName)
                .toList();

        return ResponseEntity.ok(response);
    }
}
