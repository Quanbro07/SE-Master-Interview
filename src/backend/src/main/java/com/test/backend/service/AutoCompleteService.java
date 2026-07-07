package com.test.backend.service;

import com.test.backend.dataStructure.Trie;
import com.test.backend.entity.position.Position;
import com.test.backend.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class AutoCompleteService {
    private final Trie trie = new Trie();

    private final PositionRepository positionRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void initTrieSearch() {
        System.out.println("Starting insert Position into Trie...");
        List<Position> positionList = positionRepository.findAll();
        for(Position p: positionList) {
            trie.insert(p.getPositionName());

        }
        System.out.println("Done insert " + positionList.size() + " positions.");
    }

    // Search
    public List<String> search(String prefix) {
        return trie.getWordsWithPrefix(prefix, 10);
    }

    // Add new word  into Trie
    public void addWord(String word) {
        trie.insert(word);
    }
}
