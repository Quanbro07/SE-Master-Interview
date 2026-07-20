package com.test.backend.controller;

import com.test.backend.service.FileService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RequiredArgsConstructor
@Controller
@RequestMapping("api/v1/file")
public class UploadController {
    private final FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<String> uploadImg(@RequestParam ("file") MultipartFile file) {
        try {
            String response = fileService.uploadFile("cv-bucket", file, "test_file");
            return ResponseEntity.ok(response);
        }
        catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
