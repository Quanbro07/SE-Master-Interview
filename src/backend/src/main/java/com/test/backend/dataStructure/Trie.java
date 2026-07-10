package com.test.backend.dataStructure;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Trie {
    private final TrieNode root;

    public Trie() {
        root = new TrieNode();
    }

    // Add 1 từ vào Trie
    public void insert(String word) {
        if(word == null || word.trim().isEmpty()) {
            return;
        }

        TrieNode current = root;

        String normalizedWord = word.toLowerCase();

        for(char ch : normalizedWord.toCharArray()) {
            current.children.putIfAbsent(ch, new TrieNode());
            current = current.children.get(ch);
        }

        current.isEndOfWord = true;
    }

    public List<String> getWordsWithPrefix(String prefix, int limit) {
        List<String> results = new ArrayList<>();
        if (prefix == null || prefix.trim().isEmpty()) return results;

        TrieNode current = root;
        String normalizedPrefix = prefix.toLowerCase();

        // 1. Đi dọc theo cây để tìm đến Node cuối cùng của prefix
        for (char ch : normalizedPrefix.toCharArray()) {
            current = current.children.get(ch);
            if (current == null) {
                return results; // Không có từ nào bắt đầu bằng prefix này
            }
        }

        // 2. Dùng thuật toán duyệt sâu (DFS) để gom các chữ cái tiếp theo
        dfs(current, new StringBuilder(normalizedPrefix), results, limit);
        return results;
    }

    private void dfs(TrieNode node, StringBuilder currentWord, List<String> results, int limit) {
        if (results.size() >= limit) {
            return; // Đủ số lượng thì dừng
        }

        if (node.isEndOfWord) {
            results.add(currentWord.toString());
        }

        for (Map.Entry<Character, TrieNode> entry : node.children.entrySet()) {
            currentWord.append(entry.getKey());       // Tiến lên
            dfs(entry.getValue(), currentWord, results, limit);
            currentWord.deleteCharAt(currentWord.length() - 1); // Backtrack lại
        }
    }
}
