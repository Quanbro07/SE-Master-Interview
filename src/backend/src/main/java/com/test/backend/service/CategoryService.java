package com.test.backend.service;

import com.test.backend.entity.category.Category;
import com.test.backend.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@RequiredArgsConstructor
@Service
public class CategoryService {
    private final CategoryRepository categoryRepository;

    public Category checkCreateAndReturn(String categoryName) {
        categoryName = categoryName.trim().replaceAll("\\s+", " ");

        Optional<Category> category = categoryRepository.findByCategoryNameIgnoreCase(categoryName);
        if (category.isPresent()) {
            return category.get();
        }
        Category newCategory = Category.builder()
                .categoryName(categoryName)
                .build();

        try {
            categoryRepository.save(newCategory);
        }
        catch (DataIntegrityViolationException ex) {
            return categoryRepository.findByCategoryNameIgnoreCase(categoryName)
                    .orElseThrow(() -> ex);
        }

        return newCategory;
    }
}
