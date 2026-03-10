ELO is based on
wins/draws/losses:
win: +100
loss: -50

ELO stat in db is keeped updated when new stats are added

TEXT ELO is craeted when
fetching the user stats:
<200	  : Noob 
200 - 399 : Beginner
400 - 599 : Intermediate
600 - 899 : Pro
900 - 1000: Master

ELO text isn't stored in db, it's just calculated when requested