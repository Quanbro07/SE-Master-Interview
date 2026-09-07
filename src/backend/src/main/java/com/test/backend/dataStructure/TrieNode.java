package com.test.backend.dataStructure;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class TrieNode {
    // Dùng ConcurrentHashMap để an toàn khi có nhiều request/thread cùng thao tác thêm mới
    Map<Character, TrieNode> children = new ConcurrentHashMap<>();
    boolean isEndOfWord = false;

    List<String> originalStrings = new ArrayList<>();
}
