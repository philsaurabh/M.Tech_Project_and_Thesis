# M.Tech. Project: A Deep Learning Approach for Heart Sound Segmentation and Classification

M.Tech (Information Technology) thesis, ABV-Indian Institute of Information Technology and Management, Gwalior, 2018–19.
**Author:** [Saurabh Sharma](https://sites.google.com/view/saurabh-sharma) · **Supervisor:** [Prof. Joydip Dhar](https://www.iiitm.ac.in/staff/faculty/prof-joydip-dhar)

The thesis compares classical, convolutional, recurrent and hybrid CNN–RNN networks for classifying phonocardiogram (heart sound) recordings. Recurrent models fit the training data well but overfit. The CNN generalises well but underfits. Hybrid models combine the two, and **CNN-Bi-LSTM** is the best (92% training accuracy, 85% validation accuracy, 91.5% recall).

**Project page:** [https://philsaurabh.github.io/MTech_Heart_Sound_Deep_Learning](https://philsaurabh.github.io/M.Tech_Project_and_Thesis)/

## Code

| File | Contents |
|---|---|
| `mtp-on-heartbeat-sound.py` | Data loading and labelling, waveform plots, Deep CNN, LSTM, Simple RNN, GRU, Bi-LSTM, Bi-GRU, Bi-RNN |
| `mtp-on-heartbeat-sound-hybrid.py` | CNN-LSTM, CNN-GRU, CNN-Bi-LSTM |

### Running

1. Download the [Heartbeat Sounds](https://www.kaggle.com/datasets/kinguistics/heartbeat-sounds) dataset (PASCAL Classifying Heart Sounds Challenge, Sets A and B). Place it so that `../input/set_a.csv` and `../input/set_a/` exist relative to the scripts. This is the default layout in a Kaggle notebook.
2. Environment: Python 3.6, Keras 2.2 (TensorFlow 1.x backend), SciPy, scikit-learn, pandas, matplotlib.
3. Run `mtp-on-heartbeat-sound.py`, then `mtp-on-heartbeat-sound-hybrid.py`.

## Publication

S. Sharma and J. Dhar, “Deep Learning Approach for Analysis of Artifacts in Heart Sound,” *Proceedings of the International Conference on Advances in Electronics, Electrical & Computational Intelligence (ICAEEC)*, 2019. Available on SSRN: https://ssrn.com/abstract=3577626 · doi:10.2139/ssrn.3577626

### Note: The article is available from SSRN under the publisher's access terms. This repository does not redistribute it.

## Dataset credit

P. Bentley, G. Nordehn, M. Coimbra and S. Mannor, *The PASCAL Classifying Heart Sounds Challenge 2011 (CHSC2011) Results*, http://www.peterjbentley.com/heartchallenge/

---
## Contact

please contact saurabh_2021cs30@iitp.ac.in for any discrepancy.

### Note: No text, figures or tables from the published article are reproduced.
