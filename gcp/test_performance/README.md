# Performance TEST

| **Spec**       | **Details**              |
|-----------------|--------------------------|
| **Instance Type** | `n1-standard-2`          |
| **vCPUs**       | 2                        |
| **Memory**      | 7.5 GB                   |
| **GPU**         | `NVIDIA T4` (1 unit)     |

## Test result

The test was done using the k6 tool, and we checked the maximum number of requests the system can handle without any issues.

### 10 seconds file

- Max: 5 req / sec  
  
<img src="./img/perform_10s_file.png" alt="perform 10s file" width="800">

### 35 seconds file

- Max: 1.33 req / sec  
  
<img src="./img/perform_35s_file.png" alt="perform 35s file" width="800">

### 60 seconds file

- Max: 0.75 req / sec  
  
<img src="./img/perform_1m_file.png" alt="perform 60s file" width="800">

### 180 seconds file

- Max: 0.25 req / sec  
  
<img src="./img/perform_3m_file.png" alt="perform 180s file" width="800">
