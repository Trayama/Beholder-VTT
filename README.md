## 0.0.17 preview

GM can place shared point lights, edit radius/softness/falloff/cone angles, and set Owlbear scene fog. Wall, door, and window sources remain shared; WALL and LIGHT effects are projected locally on each client.

Known gaps: custom light color/brightness, independent wall-to-light occlusion, ambient illumination, and real Owlbear GM/player acceptance remain open. The complete feature checklist is in docs/ROADMAP.md.

# Beholder VTT

���� Owlbear Rodeo ��������ģ�黯�������޹� TRPG ������չ����ǰ�����ص��ǵ�ͼ������ǽ���֪�ƶ���

**��ǰ�汾��0.0.17������Ԥ����**  
**����֤��GPL-3.0-only**

## ��װ

�� Owlbear Rodeo ����չ���������ӣ�

`https://trayama.github.io/Beholder-VTT/manifest.json`

`develop` ��֧�ṹ�������� GitHub Pages��

## ��ǰ����

### ǽ�塢���봰

- GM �ɻ���ֱ�ߡ����ߺ;���ǽ�壬��ѡ���ƶ�ǽ�顢�϶��˵㡢������������������
- �����Ŵ�ʱ������ǽ�η��ã�ǽ�λ���Ϊ��ͨǽ�뿪�ڣ����ں�����ǽ�α���ͬһǽ�飬�༭ʱһ���ƶ���
- GM ����Ź����е��Ŷμ��ɿ����š������赲�ƶ�����Ұ�͹��ߣ����ź��Ƴ��������赲��
- ����Ĭ��͸����Ұ�͹��ߣ�ͬʱ�赲�ƶ���
- ǽ����������ƶ�����Ұ�͹����赲���ԡ�GM �����߰�ǽ���š���ʹ�ò�ͬ��ɫ��

### Owlbear ԭ�� Move ����

- Beholder ��ǽ���֪ģʽע�ᵽ Owlbear �ٷ� Move ���ߣ������ӵڶ��������ƶ����ߡ�
- CHARACTER �� MOUNT Token ���϶�ʱʵʱ��ǽ�����ƣ�����Ҫ Token ӵ�� Light��
- ��ͨ�����ʹ�� Owlbear ԭ���϶�����ת�������ֱ���ʱ�л�ԭ��ģʽ��
- GM �ͻ��˱����ƶ���������Ϊ�����ƶ���ʽ�ƹ�ʵʱ��ײʱ�İ�ȫ����

### ���������

- �������� LINE ����ǽ���ΨһȨ�����Σ�ÿ���ͻ��˰���Ұ�����ؽ����� WALL ͶӰ��
- GM �����ߺ� WALL ͶӰ��Ϊ���ض��󣬲���ͬ���������ͻ��ˡ�
- ���Ͻǿ���������ȫ�ֿ��غ�״̬���Ҳ�ǽ�幤�߸����ͼ�༭��

## �ؼ��ܹ��߽�

���� LINE ��ǽ������Դ������ WALL ���ṩ Owlbear ����Ұ�ڵ���Owlbear ԭ�� WALL ��������ƶ��������ײ��ϣ���� Beholder ���ֱ��� WALL ��ԭ�� blocking �رգ������Լ����ƶ���������ȡ���� LINE��ǽ�����ݶԿͻ��˿ɼ���������ʾ���������ܡ�

## ��δ���

- ��ʵ Owlbear �����е� GM/���˫�ͻ������գ������ǹٷ� Move ģʽ�л���Token �޴�ǽ����ѡ�顢��ͨ����϶�����ת���š������ͳ������ء�
- �˵��Զ����ӡ�ǽ�彻��ͽӷ���������˴�����
- ���������ڵ�����������̬���պͶ�̬������
- ·��Ԥ������ǽѰ·�������뷶Χָʾ�������򴥷���
- Actor����ɫ�����Զ��嶯�������ӡ��ж���Դ׷������HP ��״̬ģ�顣
- �Ի�����־�����֡�SVG ת���������͹���ģ�塣

�Զ������ͨ����������ʵ��������ͨ����δ�����ʵ�������ԵĹ����Ա��ΪԤ����

## ���ؿ���

��Ҫ Node.js 22 ����°汾��

```bash
npm install
npm run check
npm run dev
```

`npm run dev` ���� `http://localhost:5173/manifest.json` �ṩ���� Manifest��

## ����

`npm run check` ִ�����ͼ�顢�����͵�Ԫ���ԡ�ÿ����ͼ���ܻ���Ҫ����ʵ Owlbear ������� GM/���˫�ͻ��˲��Ժ󣬲�����Ϊ�����չ��ܷ�����
